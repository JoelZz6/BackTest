import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para que tu frontend pueda hacer peticiones
  // En producción, reemplaza '*' por tu dominio específico
  app.enableCors({
    origin: '*', // <- cambiar por tu frontend URL en prod
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Render asigna el puerto mediante la variable de entorno PORT
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Servidor corriendo en puerto ${port}`);
}
bootstrap();
