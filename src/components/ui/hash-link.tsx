'use client';

// A link to a section of a page (`/en#how-it-works`) that scrolls there every time it is
// clicked. Next's router does nothing when the URL already ends in the same hash, so after one
// click and a scroll back up the link went dead. On the page it points to, the click scrolls
// the section into view itself and moves focus there; from any other page it is a plain link.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';
import { sectionOnPage } from './section-hash';

/** Focuses an element that is not focusable by itself, without scrolling to it. */
function focusSection(target: HTMLElement) {
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/** Scrolls to `href`'s section when it is on the current page; true when it did. */
export function scrollToSection(href: string, pathname: string): boolean {
  const id = sectionOnPage(href, pathname);
  const target = id === null ? null : document.getElementById(id);
  if (!target) return false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  focusSection(target);
  window.history.replaceState(window.history.state, '', `#${encodeURIComponent(target.id)}`);
  return true;
}

/** Plain clicks only: a modified click (new tab, new window) keeps the browser's behaviour. */
export function onSectionLinkClick(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string
) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (scrollToSection(href, pathname)) event.preventDefault();
}

type HashLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

export function HashLink({ href, onClick, ...rest }: HashLinkProps) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        onSectionLinkClick(event, href, pathname);
      }}
      {...rest}
    />
  );
}
