# UX: store pages prototype

Who uses it: people looking for their nearest Carpet Court, mostly on a phone, often while doing something else. They come from search or the header's store selector, compare a few stores, then book a free measure or visit a store page.

## Store Locator
| Scenario | Behaviour |
|---|---|
| First visit | The list shows all nearby stores, sorted by Soonest available, with the first one selected. The count reads "N stores within 50 km". |
| Focus the search field (empty) | A list shows "Use my current location" and up to 3 recent searches. |
| Type 3+ characters | Suburb suggestions appear, with the matching part in bold. Arrow keys move the highlight, and Enter or click picks one and searches. Esc or clicking outside closes the list, and the typed text is kept. |
| No suburb matches | The list reads 'No suburbs match "…"'. Check the spelling, or search by postcode. Search still works for postcodes. |
| Search runs | Loading skeletons show for about a second, then results. Filters and sort are kept. |
| Search outside the area | "No stores within 50 km of …" offers "Search another suburb". |
| Filters leave nothing | "No stores match those filters" offers Clear filters and Search another suburb. |
| Stores fail to load | "We couldn't load stores" with Try again. The search and filters are kept. |
| Use my location | The button reads "Locating…" with a notice. If allowed, it reads "My location", with a notice and a Change link. If blocked, a red-bordered notice explains how to allow it or search instead. |
| Desktop filters | Each chip opens a dropdown. Changes are drafts until Apply. Clear empties the group, and clicking outside or Esc cancels. Chips show a count, for example "Services (1)". |
| Mobile filters | One "Filters" chip opens a 600px bottom sheet. The list scrolls, while the title and the Clear all / "Show N stores" buttons stay put. The count updates live. |
| Map view | Desktop: the list sits on the left and the map on the right, filling the screen and sticking. Mobile: the map appears above the cards. Clicking a pin selects the store, and the selected store bar shows View store page and Book now. Close deselects. |
| Drag the map | "Search this area" appears at the top. It shows "Searching..." and then refreshes the results. |
| Mobile list | The selected card is full (photo, earliest time, buttons), and the others are compact. Tapping a compact card expands it. Show more reveals the rest. |
| Book this time / Book now | Opens the AI chat with the store and time. There is no form. |
| Refresh or come back | Search, filters, sort, view and selection are kept for the session. Recent searches persist on the device. |

## Store Details
| Scenario | Behaviour |
|---|---|
| Arrive | Hero with name, address, rating, today's hours, and Book a free consultation / Full store details / Get directions. |
| View full hours | Desktop: a popover under the link that closes on outside click or Esc. Mobile: a bottom sheet. |
| Scroll | The sub-nav sticks and highlights the current section. On desktop, the stuck bar also shows the store name and Book a free consultation. |
| Booking panel | Tue 8 Sept is pre-selected with its times. Pick a time and Continue is enabled, then opens the AI chat with the day and time. The month arrows move between September and October. |
| Request a callback | Opens the AI chat. |
| Videos | Compact "Take a look inside" opens full screen. Feature videos play in place, and full screen opens the modal. Exit full screen returns to the inline video, still playing. Close (X) stops it. |
| FAQ | An accordion: + becomes − and the answer shows. |
| Mobile | The Book tab and booking panel come first. After you scroll past the hero buttons, a sticky bar shows the store, a call button and "Book measure". |

## Principles
- Never lose input: the typed search survives closing suggestions, errors and refreshes.
- Clear state at a glance: selected chips, cards and pins are blue, and counts are always visible.
- Every dead end has a way out: Clear filters, Search another suburb, Try again, Change.
- Keyboard and screen reader: combobox and listbox roles, focus returns after dialogs close, Esc closes, and focus stays inside modal dialogs.
