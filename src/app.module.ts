import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'dpg-d4viah24d50c73829rp0-a',
      port: 5432,
      username: 'admin',  // Del docker-compose
      password: 'tXCA0nsb6mz2rbJcxizQCWB9FkITWdZL',
      database: 'octonet',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,  // Solo para dev, no en prod
      ssl: { rejectUnauthorized: false },
    }),
    UsersModule,
    AuthModule,
    BusinessModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}