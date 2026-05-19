import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOrderDto) {
    return this.prisma.order.create({
      data: {
        studentId: dto.studentId,
        title: dto.title,
        amount: dto.amount,
      },
    });
  }

  findAll() {
    return this.prisma.order.findMany({ orderBy: { paidAt: 'desc' }, include: { student: true } });
  }
}
