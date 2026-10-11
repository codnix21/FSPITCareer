import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Persist a skill only after user selection.
 * Never called from autocomplete/search paths.
 */
@Injectable()
export class SkillPersistenceService {
  constructor(private prisma: PrismaService) {}

  async ensureSkill(input: {
    name: string;
    externalSource?: string | null;
    externalId?: string | null;
  }) {
    const name = input.name.trim();
    if (!name) throw new Error('Skill name is required');

    const source = input.externalSource?.trim() || null;
    const externalId = input.externalId?.trim() || null;

    if (source && externalId) {
      const byExternal = await this.prisma.skill.findFirst({
        where: { externalSource: source, externalId },
      });
      if (byExternal) {
        if (byExternal.name !== name) {
          return this.prisma.skill.update({
            where: { id: byExternal.id },
            data: { name, slug: slugify(name), isActive: true },
          });
        }
        return byExternal;
      }
    }

    const byName = await this.prisma.skill.findUnique({ where: { name } });
    if (byName) {
      if (source && externalId && (!byName.externalSource || !byName.externalId)) {
        return this.prisma.skill.update({
          where: { id: byName.id },
          data: { externalSource: source, externalId, isActive: true },
        });
      }
      return byName;
    }

    return this.prisma.skill.create({
      data: {
        name,
        slug: slugify(name),
        externalSource: source,
        externalId,
        isActive: true,
      },
    });
  }
}
