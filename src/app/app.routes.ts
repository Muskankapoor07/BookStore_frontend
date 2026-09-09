import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { Home } from './pages/home/home';
import { BookDetails } from './pages/book-details/book-details';
import { MyCart } from './pages/my-cart/my-cart';
import { Wishlist } from './pages/wishlist/wishlist';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'signup', component: Login },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'home', component: Home },
  { path: 'dashboard', redirectTo: 'home', pathMatch: 'full' },
  { path: 'book/:id', component: BookDetails },
  { path: 'cart', component: MyCart },
  { path: 'my-cart', redirectTo: 'cart', pathMatch: 'full' },
  { path: 'wishlist', component: Wishlist },
];



