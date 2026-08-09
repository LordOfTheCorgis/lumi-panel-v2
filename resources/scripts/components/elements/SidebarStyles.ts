// Shared class strings for anything that renders as a row inside the sidebar.
// Kept in their own module so components the sidebar imports (the search
// trigger, for one) can match its styling without an import cycle.

export const SidebarLinkStyle =
    'flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm no-underline text-neutral-300 ' +
    'cursor-pointer transition-colors duration-150 hover:bg-neutral-700 hover:text-neutral-50';

// Applied by NavLink on top of SidebarLinkStyle. Tailwind emits hover variants
// after the base utilities, so hovering an active link still lightens it.
export const SidebarActiveStyle = 'bg-lumi-500/10 text-lumi-400 font-medium';

// Fixed-size box every row leads with, so labels align whether the row has an
// icon, an avatar, or nothing at all.
export const SidebarIconStyle = 'w-4 h-4 flex items-center justify-center shrink-0';
