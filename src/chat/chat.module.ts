import { Module } from '@nestjs/common';
import { ChatProxyController } from './chat-proxy.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [ChatProxyController],
})
export class ChatModule {}