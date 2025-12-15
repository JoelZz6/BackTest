// src/business/business.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Business } from './entities/business.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private businessRepo: Repository<Business>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    private mainDataSource: DataSource, // conexión principal (defaultdb)
  ) {}

  // 🔌 Conexión a la DB del negocio (Aiven)
  private async getBusinessDataSource(dbName: string): Promise<DataSource> {
    const ds = new DataSource({
      type: 'postgres',
      host: process.env.AIVEN_HOST,
      port: Number(process.env.AIVEN_PORT),
      username: process.env.AIVEN_USER,
      password: process.env.AIVEN_PASSWORD,
      database: dbName,

      ssl: {
        rejectUnauthorized: false,
      },
    });

    return ds.initialize();
  }

  async createBusiness(dto: CreateBusinessDto, user: User) {
    if (user.businessDbName) {
      throw new ConflictException('Ya tienes un negocio registrado');
    }

    const dbName = `db_${user.id}`;

    // 1️⃣ Crear la base de datos del negocio
    await this.mainDataSource.query(`CREATE DATABASE "${dbName}"`);

    // 2️⃣ Conectar a la nueva DB
    const ds = await this.getBusinessDataSource(dbName);

    try {
      // 3️⃣ Crear tablas
      await ds.query(`
        CREATE TABLE product (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          market_price DECIMAL(10,2) NOT NULL,
          image_url TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_product_name ON product(name);
        CREATE INDEX idx_product_active ON product(is_active);

        CREATE TABLE lot (
          id SERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES product(id) ON DELETE CASCADE,
          entry_price DECIMAL(10,2) NOT NULL,
          quantity INTEGER NOT NULL,
          remaining INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE sale (
          id SERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES product(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL,
          exit_price DECIMAL(10,2) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_sale_product ON sale(product_id);
        CREATE INDEX idx_sale_date ON sale(created_at DESC);
      `);

      console.log(`✅ Tablas creadas en ${dbName}`);
    } catch (error) {
      console.error('❌ Error creando tablas:', error);

      // rollback: borrar la DB si falló
      await this.mainDataSource.query(`DROP DATABASE IF EXISTS "${dbName}"`);

      throw new ConflictException('Error al crear las tablas del negocio');
    } finally {
      await ds.destroy();
    }

    // 4️⃣ Guardar negocio y actualizar usuario
    const business = this.businessRepo.create({
      name: dto.name,
      category: dto.category,
      description: dto.description,
      phone: dto.phone,
      address: dto.address,
      ownerId: user.id,
      dbName,
    });

    await this.businessRepo.save(business);

    user.roles = [
      ...new Set([...user.roles, UserRole.GERENTE_NEGOCIO, UserRole.EMPLEADO]),
    ];
    user.businessDbName = dbName;

    await this.userRepo.save(user);

    return {
      message: 'Negocio creado con éxito',
      business,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        businessDbName: user.businessDbName,
      },
    };
  }

  async getMyBusiness(user: User) {
    if (!user.businessDbName) return null;

    return this.businessRepo.findOne({
      where: { ownerId: user.id },
    });
  }

  async getPublicInfo(dbName: string) {
    const result = await this.mainDataSource.query(
      `SELECT name, phone, description, category, address
       FROM business
       WHERE "dbName" = $1`,
      [dbName],
    );

    return result[0] || null;
  }
}
