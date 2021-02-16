import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Column, Entity, OneToMany } from 'typeorm';
import { IsArray, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Restaurant } from './restaurant.entity';

@InputType('CategoryInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class Category extends CoreEntity {
  @Column({ unique: true })
  @Field((type) => String)
  @IsString()
  @Length(5)
  name: String;

  @Column({ unique: true })
  @Field((type) => String, { nullable: true })
  @IsString()
  coverImg: string;

  @Column({ unique: true })
  @Field((type) => String)
  @IsString()
  slug: String;

  @OneToMany((type) => Restaurant, (restaurant) => restaurant.category)
  @Field((type) => [Restaurant])
  @IsArray()
  restaurants: Restaurant[];
}
