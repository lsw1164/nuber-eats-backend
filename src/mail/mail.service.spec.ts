import { Test } from '@nestjs/testing';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { MailModuleOptions } from './mail.interfaces';
import { MailService } from './mail.service';
import * as FormData from 'form-data';
import got from 'got';

jest.mock('got');
jest.mock('form-data');

const TEST_API_KEY = 'test-apiKey';
const TEST_FROM_EMAIL = 'test@fromEmail.com';
const TEST_DOMAIN = 'test-domain';
const testOptions: MailModuleOptions = {
  apiKey: TEST_API_KEY,
  domain: TEST_DOMAIN,
  fromEmail: TEST_FROM_EMAIL,
};

describe('MailService', () => {
  let service: MailService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: testOptions,
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should call sendEmail', () => {
      const sendVerificationEmailArgs = {
        email: 'email',
        code: 'code',
      };
      jest.spyOn(service, 'sendEmail').mockImplementation(async () => true);
      service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      expect(service.sendEmail).toHaveBeenCalledTimes(1);
      expect(service.sendEmail).toHaveBeenCalledWith(
        'Verify Your Email',
        'verify-email',
        [
          { key: 'code', value: sendVerificationEmailArgs.code },
          { key: 'username', value: sendVerificationEmailArgs.email },
        ],
      );
    });
  });

  describe('sendEmail', () => {
    const sendEmailArgs = {
      subject: 'testSubject',
      template: 'testTemplate',
      emailVars: [],
    };

    it('send email', async () => {
      const formSpy = jest.spyOn(FormData.prototype, 'append');
      const result = await service.sendEmail(
        sendEmailArgs.subject,
        sendEmailArgs.template,
        sendEmailArgs.emailVars,
      );
      expect(formSpy).toHaveBeenCalled();
      expect(got.post).toHaveBeenCalledTimes(1);
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${TEST_DOMAIN}/messages`,
        expect.any(Object),
      );
      expect(result).toEqual(true);
    });
    it('fails on error', async () => {
      jest.spyOn(got, 'post').mockRejectedValue(new Error());
      const result = await service.sendEmail(
        sendEmailArgs.subject,
        sendEmailArgs.template,
        sendEmailArgs.emailVars,
      );
      expect(result).toEqual(false);
    });
  });
});
