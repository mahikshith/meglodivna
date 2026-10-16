// Route coordinates are not globally ordered once contact portals branch into realms.
export function resumeRouteIndex(level, route, player) {
  const realmAt = x => level.crossings?.find(crossing => x >= crossing.x && x < crossing.x + crossing.w)?.id;
  const center = player.x + player.w / 2, realm = realmAt(center);
  const index = route.findIndex(marker => realmAt(marker.x) === realm && marker.x >= center - 55);
  return index < 0 ? route.length - 1 : index;
}
