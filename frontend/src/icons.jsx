import React from 'react';

function Icon({ name, size = 18, strokeWidth = 1.8, ...props }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const shapes = {
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" {...common} />,
    search: <><circle cx="11" cy="11" r="7" {...common}/><path d="m20 20-4-4" {...common}/></>,
    plus: <path d="M12 5v14M5 12h14" {...common}/>,
    sliders: <><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M2 14h4m4-6h4m4 8h4" {...common}/><circle cx="4" cy="12" r="2" {...common}/><circle cx="12" cy="6" r="2" {...common}/><circle cx="20" cy="14" r="2" {...common}/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...common}/><circle cx="10" cy="7" r="4" {...common}/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" {...common}/></>,
    bed: <><path d="M2 4v17M2 8h15a5 5 0 0 1 5 5v8M2 17h20M6 8v9" {...common}/><circle cx="6" cy="5" r="2" {...common}/></>,
    userCheck: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...common}/><circle cx="10" cy="7" r="4" {...common}/><path d="m16 11 2 2 4-4" {...common}/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" {...common}/></>,
    more: <><circle cx="5" cy="12" r="1" {...common}/><circle cx="12" cy="12" r="1" {...common}/><circle cx="19" cy="12" r="1" {...common}/></>,
    pencil: <><path d="m16 4 4 4L8 20H4v-4z" {...common}/><path d="m14 6 4 4" {...common}/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" {...common}/></>,
    x: <path d="m18 6-12 12M6 6l12 12" {...common}/>,
    check: <path d="m5 12 4 4L19 6" {...common}/>,
    chevron: <path d="m6 9 6 6 6-6" {...common}/>,
    stethoscope: <><path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4m4 0h4M10 12v2a6 6 0 0 0 12 0v-1" {...common}/><circle cx="19" cy="10" r="2" {...common}/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" {...common}/><path d="M16 3v4M8 3v4M3 11h18" {...common}/><path d="M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01" {...common}/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" {...common}/>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" {...common}/><path d="M5.6 9a7 7 0 0 1 11.55-2.6L20 12M4 12l2.85 5.6A7 7 0 0 0 18.4 15" {...common}/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>{shapes[name]}</svg>;
}
const named = (name) => (props) => <Icon name={name} {...props}/>;
export const Activity = named('activity');
export const Search = named('search');
export const Plus = named('plus');
export const SlidersHorizontal = named('sliders');
export const Users = named('users');
export const BedDouble = named('bed');
export const UserRoundCheck = named('userCheck');
export const ArrowUpRight = named('arrow');
export const MoreHorizontal = named('more');
export const Pencil = named('pencil');
export const Trash2 = named('trash');
export const X = named('x');
export const Check = named('check');
export const ChevronDown = named('chevron');
export const Stethoscope = named('stethoscope');
export const CalendarDays = named('calendar');
export const Menu = named('menu');
export const RotateCcw = named('refresh');
