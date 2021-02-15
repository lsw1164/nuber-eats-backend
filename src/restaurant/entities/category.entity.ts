import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, OneToMany } from 'typeorm';
import { IsArray, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Restaurant } from './restaurant.entity';

@ObjectType()
@Entity()
export class Category extends CoreEntity {
  @Column()
  @Field((type) => String)
  @IsString()
  @Length(5)
  name: String;

  @Column()
  @Field((type) => String)
  @IsString()
  coverImg: string;

  @OneToMany((type) => Restaurant, (restaurant) => restaurant.category)
  @Field((type) => [Restaurant])
  @IsArray()
  restaurants: Restaurant[];
}
