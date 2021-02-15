import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToOne } from 'typeorm';
import { IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Category } from './category.entity';

@ObjectType()
@Entity()
export class Restaurant extends CoreEntity {
  @Column()
  @Field((type) => String)
  @IsString()
  @Length(5)
  name: String;

  @Column()
  @IsString()
  @Field((type) => String)
  coverImg: String;

  @Column()
  @IsString()
  @Field((type) => String, { defaultValue: 'pangyou' })
  address: String;

  @ManyToOne((type) => Category, (category) => category.restaurants)
  @IsString()
  @Field((type) => String)
  category: Category;
}
