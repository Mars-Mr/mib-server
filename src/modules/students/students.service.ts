import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        emergencyName: dto.emergencyName,
        emergencyPhone: dto.emergencyPhone,
        emergencyRelation: dto.emergencyRelation,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
        userId: dto.userId,
      },
      include: { tags: { include: { tag: true } }, groups: { include: { group: true } } },
    });
  }

  findAll() {
    return this.prisma.student.findMany({
      orderBy: { createdAt: 'desc' },
      include: { tags: { include: { tag: true } }, groups: { include: { group: true } } },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.student.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, groups: { include: { group: true } } },
    });
    if (!s) throw new NotFoundException('学员不存在');
    return s;
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: {
        ...dto,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
      },
      include: { tags: { include: { tag: true } }, groups: { include: { group: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.student.delete({ where: { id } });
    return { ok: true };
  }

  async addTag(studentId: string, tagId: string) {
    await this.findOne(studentId);
    return this.prisma.studentTag.create({
      data: { studentId, tagId },
      include: { tag: true },
    });
  }

  async removeTag(studentId: string, tagId: string) {
    await this.prisma.studentTag.delete({ where: { studentId_tagId: { studentId, tagId } } });
    return { ok: true };
  }

  async addGroup(studentId: string, groupId: string) {
    await this.findOne(studentId);
    return this.prisma.studentGroup.create({
      data: { studentId, groupId },
      include: { group: true },
    });
  }

  async removeGroup(studentId: string, groupId: string) {
    await this.prisma.studentGroup.delete({
      where: { studentId_groupId: { studentId, groupId } },
    });
    return { ok: true };
  }

  listTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  createTag(name: string) {
    return this.prisma.tag.create({ data: { name } });
  }

  listGroups() {
    return this.prisma.group.findMany({ orderBy: { name: 'asc' } });
  }

  createGroup(name: string) {
    return this.prisma.group.create({ data: { name } });
  }
}
