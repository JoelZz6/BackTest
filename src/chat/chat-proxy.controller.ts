// src/chat/chat-proxy.controller.ts
import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { Response } from 'express';
import { firstValueFrom } from 'rxjs';

@Controller('chat')
export class ChatProxyController {
  constructor(private readonly httpService: HttpService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async proxyChat(@Body() body: any, @Res() res: Response) {
    console.log('Body recibido en proxy:', body); // ← LOG IMPORTANTE

    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({ message: 'Body vacío o inválido' });
    }

    try {
      const lunaResponse = await firstValueFrom(
        this.httpService.post(
          'https://asistente-virtual-py.onrender.com/chat',
          body, // ← Envía exactamente el mismo body
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          },
        ),
      );

      console.log('Respuesta de Luna:', lunaResponse.data);
      return res.json(lunaResponse.data);
    } catch (error: any) {
      console.error('Error proxying to Luna IA:', error.message);
      console.error('Error response:', error.response?.data);

      const status = error.response?.status || 500;
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Luna está ocupada, inténtalo en un momento ☕';

      return res.status(status).json({ message });
    }
  }
}