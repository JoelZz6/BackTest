// src/chat/chat-proxy.controller.ts
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

@Controller('chat')
export class ChatProxyController {
  constructor(private readonly httpService: HttpService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async proxyChat(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const lunaResponse = await firstValueFrom(
        this.httpService.post(
          'https://asistente-virtual-py.onrender.com',  // <-- URL de tu servicio Luna IA en Render
          body,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 60000, // 60 segundos (Groq es rápido, pero por si acaso)
          },
        ),
      );

      return res.json(lunaResponse.data);
    } catch (error: any) {
      console.error('Error proxying to Luna IA:', error.message);

      const status = error.response?.status || 500;
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Luna está tomando un cafecito, inténtalo en un momento ☕';

      return res.status(status).json({ message });
    }
  }
}