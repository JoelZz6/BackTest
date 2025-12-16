// src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { AnalyticsProxyController } from './analytics-proxy.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule], // Necesario para HttpService
  controllers: [AnalyticsProxyController],
})
export class AnalyticsModule {}