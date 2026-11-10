import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pokemon' },
  {
    path: 'pokemon',
    title: 'Explorar Pokémon · Peta',
    loadComponent: () => import('./pages/list/list.page').then((m) => m.ListPage),
  },
  {
    path: 'detail/:id',
    title: 'Ficha del Pokémon · Peta',
    loadComponent: () => import('./pages/detail/detail.page').then((m) => m.DetailPage),
  },
  { path: '**', redirectTo: 'pokemon' },
];
