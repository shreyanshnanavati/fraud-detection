import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { ProcessedFilesModule } from './processed-files/processed-files.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MulterModule.register({
      dest: './uploads',
    }),
    PrismaModule,
    UsersModule,
    IngestionModule,
    ProcessedFilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
