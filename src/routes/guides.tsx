import { Outlet, createFileRoute } from '@tanstack/react-router'

/**
 * Pathless layout required by the file-based router for `/guides/*`: the
 * index and `$slug` routes each render their own full page (header, container,
 * footer), so this has nothing to add and is just the Outlet.
 */
export const Route = createFileRoute('/guides')({
  component: () => <Outlet />,
})
