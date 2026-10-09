import {User} from './models/User.js';
import {Session} from './models/Session.js';
import {Booking} from './models/Booking.js';
import {WaitlistEntry} from './models/WaitlistEntry.js';
import {WalletEntry} from './models/WalletEntry.js';
import {TopUp} from './models/TopUp.js';

import {UserRepository} from './repositories/user.repository.js';
import {SessionRepository} from './repositories/session.repository.js';
import {BookingRepository} from './repositories/booking.repository.js';
import {WaitlistRepository} from './repositories/waitlist.repository.js';
import {WalletRepository} from './repositories/wallet.repository.js';
import {TopUpRepository} from './repositories/topup.repository.js';

import {AuthService} from './modules/auth/auth.service.js';
import {SessionsService} from './modules/sessions/sessions.service.js';
import {BookingsService} from './modules/bookings/bookings.service.js';
import {WaitlistService} from './modules/waitlist/waitlist.service.js';
import {CheckInService} from './modules/checkin/checkin.service.js';
import {WalletService} from './modules/wallet/wallet.service.js';

import {AuthController} from './modules/auth/auth.controller.js';
import {SessionsController} from './modules/sessions/sessions.controller.js';
import {BookingsController} from './modules/bookings/bookings.controller.js';
import {WaitlistController} from './modules/waitlist/waitlist.controller.js';
import {CheckInController} from './modules/checkin/checkin.controller.js';
import {WalletController} from './modules/wallet/wallet.controller.js';

import {createAuthRouter} from './modules/auth/auth.routes.js';
import {createSessionsRouter} from './modules/sessions/sessions.routes.js';
import {createBookingsRouter} from './modules/bookings/bookings.routes.js';
import {createWaitlistRouter} from './modules/waitlist/waitlist.routes.js';
import {createCheckInRouter} from './modules/checkin/checkin.routes.js';
import {createWalletRouter} from './modules/wallet/wallet.routes.js';

import {createAuthenticate} from './middleware/authenticate.js';
import {withTransaction} from './db/connect.js';

export function buildContainer(){
  const userRepository=new UserRepository({userModel:User});
  const sessionRepository=new SessionRepository({sessionModel:Session});
  const bookingRepository=new BookingRepository({bookingModel:Booking});
  const waitlistRepository=new WaitlistRepository({waitlistModel:WaitlistEntry});
  const walletRepository=new WalletRepository({userModel:User,walletEntryModel:WalletEntry});
  const topUpRepository=new TopUpRepository({topUpModel:TopUp});

  const unitOfWork=withTransaction;

  const authService=new AuthService({userRepository});
  const sessionsService=new SessionsService({sessionRepository,bookingRepository,waitlistRepository});
  const bookingsService=new BookingsService({sessionRepository,bookingRepository,waitlistRepository,walletRepository,unitOfWork});
  const waitlistService=new WaitlistService({sessionRepository,bookingRepository,waitlistRepository,unitOfWork});
  const checkInService=new CheckInService({bookingRepository});
  const walletService=new WalletService({userRepository,walletRepository,topUpRepository,unitOfWork});

  const authController=new AuthController({authService});
  const sessionsController=new SessionsController({sessionsService});
  const bookingsController=new BookingsController({bookingsService});
  const waitlistController=new WaitlistController({waitlistService});
  const checkInController=new CheckInController({checkInService});
  const walletController=new WalletController({walletService});

  const authenticate=createAuthenticate({userRepository});

  return {
    routers:{
      auth:createAuthRouter({authController,authenticate}),
      sessions:createSessionsRouter({sessionsController,authenticate}),
      bookings:createBookingsRouter({bookingsController,authenticate}),
      waitlist:createWaitlistRouter({waitlistController,authenticate}),
      checkIns:createCheckInRouter({checkInController,authenticate}),
      wallet:createWalletRouter({walletController,authenticate})
    }
  };
}
