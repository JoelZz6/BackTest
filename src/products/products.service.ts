// src/products/products.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddLotDto } from './dto/add-lot.dto';
import { RegisterSaleDto } from './dto/register-sale.dto';

@Injectable()
export class ProductsService {
  constructor(private mainDataSource: DataSource) {}

  // Conexión temporal a la DB del negocio
  private async getBusinessDataSource(dbName: string) {
    const isRender = process.env.RENDER === 'true';
    const host = isRender
      ? 'dpg-d4viah24d50c73829rp0-a' // host interno Render
      : 'dpg-d4viah24d50c73829rp0-a.virginia-postgres.render.com'; // host externo local

    return await new DataSource({
      type: 'postgres',
      host,
      port: 5432,
      username: 'admin',
      password: 'tXCA0nsb6mz2rbJcxizQCWB9FkITWdZL',
      database: dbName,
      ssl: !isRender ? { rejectUnauthorized: false } : undefined,
    }).initialize();
  }

  async createProduct(dto: CreateProductDto, dbName: string) {
    const ds = await this.getBusinessDataSource(dbName);
    try {
      const result = await ds.query(
        `INSERT INTO product (name, description, market_price, image_url)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [dto.name, dto.description || null, dto.market_price, dto.imageUrl || null],
      );
      const productId = result[0].id;

      await ds.query(
        `INSERT INTO lot (product_id, entry_price, quantity, remaining)
         VALUES ($1, $2, $3, $3)`,
        [productId, dto.initial_entry_price, dto.initial_quantity],
      );

      return { productId, message: 'Producto y lote inicial creados' };
    } finally {
      await ds.destroy();
    }
  }

  async addLot(dto: AddLotDto, dbName: string) {
    const ds = await this.getBusinessDataSource(dbName);
    try {
      await ds.query(
        `INSERT INTO lot (product_id, entry_price, quantity, remaining)
         VALUES ($1, $2, $3, $3)`,
        [dto.productId, dto.entry_price, dto.quantity],
      );
      return { success: true };
    } finally {
      await ds.destroy();
    }
  }

  async getProducts(dbName: string) {
    const ds = await this.getBusinessDataSource(dbName);
    try {
      return await ds.query(`
        SELECT 
          p.*,
          COALESCE(SUM(l.remaining), 0)::int AS stock
        FROM product p
        LEFT JOIN lot l ON l.product_id = p.id
        GROUP BY p.id
        ORDER BY 
          CASE WHEN COALESCE(SUM(l.remaining), 0) > 0 THEN 0 ELSE 1 END,
          p.name DESC;
      `);
    } finally {
      await ds.destroy();
    }
  }

  async updateProduct(id: number, dto: UpdateProductDto, dbName: string) {
    const ds = await this.getBusinessDataSource(dbName);
    try {
      const result = await ds.query(
        `UPDATE product SET 
           name = COALESCE($1, name),
           description = COALESCE($2, description),
           market_price = COALESCE($3, market_price),
           image_url = COALESCE($4, image_url),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [dto.name, dto.description, dto.market_price, dto.imageUrl, id],
      );
      return result[0];
    } finally {
      await ds.destroy();
    }
  }

  async deleteProduct(id: number, dbName: string) {
    const ds = await this.getBusinessDataSource(dbName);
    try {
      await ds.query(`DELETE FROM product WHERE id = $1`, [id]);
      return { success: true };
    } finally {
      await ds.destroy();
    }
  }

  async registerSale(dto: RegisterSaleDto, dbName: string) {
    const ds = await this.getBusinessDataSource(dbName);
    try {
      const lots = await ds.query(
        `SELECT id, remaining FROM lot WHERE product_id = $1 AND remaining > 0 ORDER BY created_at ASC`,
        [dto.productId],
      );

      let remainingQty = dto.quantity;
      for (const lot of lots) {
        if (remainingQty <= 0) break;
        const deduct = Math.min(remainingQty, lot.remaining);
        await ds.query(`UPDATE lot SET remaining = remaining - $1 WHERE id = $2`, [deduct, lot.id]);
        remainingQty -= deduct;
      }

      if (remainingQty > 0) throw new BadRequestException('Stock insuficiente');

      await ds.query(
        `INSERT INTO sale (product_id, quantity, exit_price, notes)
         VALUES ($1, $2, $3, $4)`,
        [dto.productId, dto.quantity, dto.exit_price, dto.notes || null],
      );

      return { success: true };
    } finally {
      await ds.destroy();
    }
  }

  async getSalesHistory(dbName: string) {
    const ds = await this.getBusinessDataSource(dbName);
    try {
      return await ds.query(`
        SELECT s.*, p.name as product_name 
        FROM sale s 
        JOIN product p ON s.product_id = p.id 
        ORDER BY s.created_at DESC
      `);
    } finally {
      await ds.destroy();
    }
  }

  async getAllProductsFromAllBusinesses() {
    const businesses = await this.mainDataSource.query(`
      SELECT "dbName", name AS business_name 
      FROM business 
      WHERE "dbName" IS NOT NULL AND "dbName" != ''
    `);

    const allProducts: any[] = [];

    for (const business of businesses) {
      const { dbName, business_name } = business;
      let ds;
      try {
        ds = await this.getBusinessDataSource(dbName);

        const products = await ds.query(`
          SELECT p.id, p.name, p.description, p.market_price, p.image_url, p.created_at
          FROM product p
          LEFT JOIN lot l ON l.product_id = p.id
          WHERE p.is_active = true
          GROUP BY p.id
          HAVING COALESCE(SUM(l.remaining), 0) > 0
          ORDER BY RANDOM()
          LIMIT 15;
        `);

        products.forEach((p: any) => {
          p.business_name = business_name || 'Tienda';
          p.business_db = dbName;
        });

        allProducts.push(...products);
      } catch (error) {
        console.log(`Error conectando a ${dbName}:`, error.message);
      } finally {
        if (ds) await ds.destroy();
      }
    }

    return allProducts.sort(() => Math.random() - 0.5);
  }

  async getBusinessPublicProducts(dbName: string) {
    const ds = await this.getBusinessDataSource(dbName);
    try {
      return await ds.query(`
        SELECT p.id, p.name, p.description, p.market_price, p.image_url, p.created_at
        FROM product p
        LEFT JOIN lot l ON l.product_id = p.id
        WHERE p.is_active = true
        GROUP BY p.id
        HAVING COALESCE(SUM(l.remaining), 0) > 0
        ORDER BY RANDOM()
        LIMIT 15;
      `);
    } finally {
      await ds.destroy();
    }
  }

  async getFullCatalogForAI() {
    const businesses = await this.mainDataSource.query(`
      SELECT "dbName", name AS business_name, phone 
      FROM business 
      WHERE "dbName" IS NOT NULL
    `);

    const catalog: any[] = [];

    for (const business of businesses) {
      const { dbName, business_name, phone } = business;
      let ds;
      try {
        ds = await this.getBusinessDataSource(dbName);

        const products = await ds.query(`
          SELECT 
            name,
            description,
            market_price::text as market_price,
            image_url
          FROM product 
          WHERE is_active = true
        `);

        products.forEach((p: any) => {
          catalog.push({
            business_name,
            business_phone: phone,
            business_db: dbName,
            ...p,
          });
        });
      } catch (error) {
        console.log(`No se pudo leer ${dbName}:`, error.message);
      } finally {
        if (ds) await ds.destroy();
      }
    }

    return catalog;
  }
}
