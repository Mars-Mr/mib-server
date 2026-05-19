import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

@Injectable()
export class CoachesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCoachDto) {
    return this.prisma.coach.create({ data: dto });
  }

  findAll() {
    return this.prisma.coach.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const c = await this.prisma.coach.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('教练不存在');
    return c;
  }

  async update(id: string, dto: UpdateCoachDto) {
    await this.findOne(id);
    return this.prisma.coach.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.coach.delete({ where: { id } });
    return { ok: true };
  }
}
