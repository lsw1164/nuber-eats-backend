import { InternalServerErrorException } from '@nestjs/common';
import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { IsBoolean, IsEmail, IsEnum, IsString } from 'class-validator';
import { Restaurant } from 'src/restaurant/entities/restaurant.entity';

export enum UserRole {
  Owner = 'Owner',
  Client = 'Client',
  Delivery = 'Delivery',
}

registerEnumType(UserRole, { name: 'UserRole' });
@InputType('UserInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class User extends CoreEntity {
  @Column({ unique: true })
  @Field(() => String)
  @IsEmail()
  email: string;

  @Column({ select: false })
  @Field(() => String)
  @IsString()
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  @Field(() => UserRole)
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ default: false })
  @Field((type) => Boolean)
  @IsBoolean()
  verified: boolean;

  @Field((type) => [Restaurant])
  @OneToMany((type) => Restaurant, (restaurant) => restaurant.owner)
  restaurants: Restaurant[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (!this.password) {
      return;
    }
    try {
      this.password = await bcrypt.hash(this.password, 10);
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async checkPassword(password: string): Promise<boolean> {
    try {
      return bcrypt.compareSync(password, this.password);
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }
}
