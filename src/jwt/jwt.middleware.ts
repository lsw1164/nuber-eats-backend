import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { UsersService } from 'src/users/users.service';
import { JwtService } from './jwt.service';

const X_JWT: string = 'x-jwt';
const ID: string = 'id';
@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      if (X_JWT in req.headers) {
        const token = req.headers[X_JWT].toString();
        const decoded = this.jwtService.verify(token);
        console.log(token, decoded);
        if (
          decoded &&
          typeof decoded === 'object' &&
          decoded.hasOwnProperty(ID)
        ) {
          const user = this.userService.findById(decoded[ID]);
          req['user'] = user;
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      next();
    }
  }
}
