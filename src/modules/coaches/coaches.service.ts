import { Injectable, NotFoundException } from '@nestjs/common';
import { DataScopeService } from '../../common/rbac/data-scope.service';
import { getAccessContext } from '../../common/rbac/request-context';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

@Injectable()
export class CoachesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScope: DataScopeService,
  ) {}

  create(dto: CreateCoachDto) {
    const ctx = getAccessContext();
    const tenantId = dto.tenantId ?? ctx?.activeTenantId ?? ctx?.tenantIds[0];
    return this.prisma.coach.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        bio: dto.bio,
        userId: dto.userId,
        tenantId,
      },
    });
  }

  findAll() {
    return this.prisma.coach.findMany({
      where: this.dataScope.coachesWhere(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.coach.findFirst({
      where: this.dataScope.coachesWhere({ id }),
    });
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
