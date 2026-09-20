import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Unknown work email');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Wrong password');
    return this.issue(user);
  }

  async directory() {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        empCode: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        id: true,
      },
    });
  }

  async signup(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException(
        'This email is not in employee_master.csv. Select a Nortex employee from the list.',
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return this.issue(updated);
  }

  async demoUsers() {
    const users = await this.prisma.user.findMany({
      where: {
        empCode: { in: ['NX-4471', 'NX-2210', 'NX-1108', 'NX-3305'] },
      },
      orderBy: { empCode: 'asc' },
      select: {
        id: true,
        empCode: true,
        name: true,
        email: true,
        role: true,
        designation: true,
      },
    });
    return users.map((u) => ({ ...u, passwordHint: u.empCode }));
  }

  private issue(user: {
    id: string;
    empCode: string;
    name: string;
    email: string;
    role: string;
    designation: string;
  }) {
    const token = this.jwt.sign({
      sub: user.id,
      empCode: user.empCode,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    return {
      token,
      user: {
        id: user.id,
        empCode: user.empCode,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
      },
    };
  }
}
