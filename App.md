# Advent Calendar

This is an Advent Calendar, where every day a new music track is released.

The page should display a header, a grid, and a player, fixed at the bottom of the page.

Here are links to different components:

Overall: https://www.figma.com/design/UcWzGfhnXYKQJpMbnqqDzp/Advent-Delights--Copy-?node-id=3-826&t=T4tOfkwNrid40tj6-11
Grid: https://www.figma.com/design/UcWzGfhnXYKQJpMbnqqDzp/Advent-Delights--Copy-?node-id=3-826&t=T4tOfkwNrid40tj6-11
DetailsCard: https://www.figma.com/design/UcWzGfhnXYKQJpMbnqqDzp/Advent-Delights--Copy-?node-id=3-826&t=T4tOfkwNrid40tj6-11
Fixed player: https://www.figma.com/design/UcWzGfhnXYKQJpMbnqqDzp/Advent-Delights--Copy-?node-id=3-826&t=T4tOfkwNrid40tj6-11


Each card of the grid has various states:
- Before date: the card is inactive
- After date:
  - unrevealed: image is blurred, click to reveal
  - revealed: image is visible, clicking opens the DetailsCard, which floats and follows the mouse
Revealed state should be stored in localStorage.

When a cover is unrevealed, use a css mask to display only part of the image. The mask can be computed on the fly and should not reveal more than 10% of the image.
When a card gets revealed, the mask should open up until it is fully revealed.

There are various states of the card here: https://www.figma.com/design/UcWzGfhnXYKQJpMbnqqDzp/Advent-Delights--Copy-?node-id=2-89&t=T4tOfkwNrid40tj6-11

Each card has a play button which should play the related track

## Tech stack

- use ReactPlayer to play links(youtube, etc)
- use use-react for localStorage hook
- use shadcn / radix for UI
- use motion for animations, unless there are simple css implementations