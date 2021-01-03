import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IsString, Length, IsBoolean, IsOptional } from 'class-validator';

@ObjectType()
@Entity()
export class Restaurant {
  @PrimaryGeneratedColumn()
  @Field(() => Number)
  id: number;

  @Column()
  @IsString()
  @Length(5)
  @Field(() => String)
  name: String;

  @Column({ default: true })
  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { defaultValue: true })
  isVegan: Boolean;

  @Column()
  @IsString()
  @Field(() => String)
  address: String;

  @Column()
  @IsString()
  @Field(() => String)
  ownerName: String;

  @Column()
  @IsString()
  @Field(() => String)
  categoryName: String;
}
