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
  url: process.env.RENDER === 'true'
    ? 'postgresql://admin:tXCA0nsb6mz2rbJcxizQCWB9FkITWdZL@dpg-d4viah24d50c73829rp0-a/octonet' // host interno Render
    : 'postgresql://admin:tXCA0nsb6mz2rbJcxizQCWB9FkITWdZL@dpg-d4viah24d50c73829rp0-a.virginia-postgres.render.com/octonet', // host externo para local
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
  ssl: process.env.RENDER === 'true' ? undefined : { rejectUnauthorized: false },
})
,
    UsersModule,
    AuthModule,
    BusinessModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}