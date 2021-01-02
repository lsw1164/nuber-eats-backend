import { Field, ArgsType } from '@nestjs/graphql';
import { IsString, Length, IsBoolean } from 'class-validator';

@ArgsType()
export class CreateRestaurantDto {
  @Field(() => String)
  @IsString()
  @Length(5, 10)
  name: String;

  @Field(() => Boolean)
  @IsBoolean()
  isVegan: Boolean;

  @Field(() => String)
  @IsString()
  address: String;

  @Field(() => String)
  @IsString()
  ownerName: String;
}
