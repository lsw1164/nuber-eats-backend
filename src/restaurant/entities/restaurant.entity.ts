import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToOne } from 'typeorm';
import { IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Category } from './category.entity';
import { User } from 'src/users/entities/user.entity';

@InputType('RestaurantInputType', { isAbstract: true })
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

  @ManyToOne((type) => Category, (category) => category.restaurants, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @IsString()
  @Field((type) => Category, { nullable: true })
  category: Category;

  @ManyToOne((type) => User, (user) => user.restaurants, {
    onDelete: 'CASCADE',
  })
  @Field((type) => User)
  owner: User;
}
