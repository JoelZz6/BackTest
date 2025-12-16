// src/analytics/analytics-proxy.controller.ts  (recomendado)

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

@Controller('analytics')
export class AnalyticsProxyController {
  constructor(private readonly httpService: HttpService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async proxyAnalytics(
    @Body() body: { business_db: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const analyticsResponse = await firstValueFrom(
        this.httpService.post(
          'https://dataservice-py.onrender.com/analytics', // <-- Cambia si tu FastAPI tiene otro nombre
          body,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 segundos de timeout por si el cálculo es pesado
          },
        ),
      );

      return res.json(analyticsResponse.data);
    } catch (error: any) {
      console.error('Error proxying to analytics service:', error.message);

      const status = error.response?.status || 500;
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Error al conectar con el servicio de análisis';

      return res.status(status).json({ message });
    }
  }
}