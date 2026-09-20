import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user';
import { ClaimsService } from './claims.service';

class ToggleDto {
  @IsBoolean()
  included: boolean;
}

class SubmitDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

class DecideDto {
  @IsIn(['APPROVED', 'RETURNED', 'REJECTED'])
  action: 'APPROVED' | 'RETURNED' | 'REJECTED';

  @IsOptional()
  @IsString()
  remarks?: string;
}

class NotesDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateRequestDto {
  @IsString()
  category: string;

  @IsString()
  purpose: string;

  @IsString()
  destination: string;

  @IsString()
  departureDate: string;

  @Type(() => Number)
  @IsNumber()
  numberOfDays: number;

  @IsString()
  modeOfTransport: string;

  @Type(() => Number)
  @IsNumber()
  estimatedRupees: number;

  @Type(() => Number)
  @IsNumber()
  advanceRupees: number;
}

@Controller()
@UseGuards(AuthGuard)
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Post('claims/request')
  createRequest(@Body() body: CreateRequestDto, @CurrentUser() user: AuthUser) {
    return this.claims.createRequest(user, {
      ...body,
      numberOfDays: Number(body.numberOfDays),
      estimatedRupees: Number(body.estimatedRupees),
      advanceRupees: Number(body.advanceRupees),
    });
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.claims.dashboard(user);
  }

  @Get('inbox')
  inbox(@CurrentUser() user: AuthUser) {
    return this.claims.inbox(user);
  }

  @Get('claims')
  list(@CurrentUser() user: AuthUser) {
    return this.claims.listForUser(user);
  }

  @Get('claims/:id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.claims.get(id, user);
  }

  @Patch('claims/:id/lines/:lineId')
  toggle(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() body: ToggleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.claims.toggleLine(id, lineId, body.included, user);
  }

  @Post('claims/:id/submit')
  submit(@Param('id') id: string, @Body() body: SubmitDto, @CurrentUser() user: AuthUser) {
    return this.claims.submit(id, body.notes, user);
  }

  @Get('approvals')
  approvals(@CurrentUser() user: AuthUser) {
    return this.claims.approvalsQueue(user);
  }

  @Post('claims/:id/decide')
  decide(@Param('id') id: string, @Body() body: DecideDto, @CurrentUser() user: AuthUser) {
    return this.claims.decide(id, body.action, body.remarks, user);
  }

  @Get('finance/queue')
  financeQueue(@CurrentUser() user: AuthUser) {
    if (user.role !== 'FINANCE') return [];
    return this.claims.financeQueue();
  }

  @Post('claims/:id/finance/verify')
  verify(@Param('id') id: string, @Body() body: NotesDto, @CurrentUser() user: AuthUser) {
    return this.claims.financeVerify(id, body.notes, user);
  }

  @Post('claims/:id/finance/pay')
  pay(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.claims.markPaid(id, user);
  }
}
