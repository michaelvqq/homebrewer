# Design research: what real houses teach our agents

Collected 2026-10-03 to improve the architect and interior-designer agents, especially for outdoor areas like backyards.

## Web sources

- [UpCodes: minimum dimensions of habitable rooms](https://up.codes/s/minimum-dimensions-of-habitable-rooms) and [interior space dimensions](https://up.codes/s/interior-space-dimensions): every habitable room is at least 2.13 m in each direction and 6.5 m² in area. Kitchens need at least 0.91 m clear between counter fronts, and 0.76 m clear in front of each appliance. Window area should be at least 10% of floor area.
- [Fine Homebuilding: minimum dimensions in the IRC](https://www.finehomebuilding.com/2024/01/10/minimum-dimensions-in-the-irc). Bedroom minimum is about 2.7 × 2.7 m, comfortable is about 3.6 × 3.6 m. A bathroom is at least 1.8 m².
- [Centre Line Home Design: floor plan zones](https://clhomedesign.com/floor-plan-zones/), [Building Advisor: circulation](https://buildingadvisor.com/design/floor-plans/circulation-key-to-a-successful-floor-plan/) and [Ecotectural: how a floor plan works](https://ecotectural.co.nz/build-knowledge/how-a-floor-plan-works-nz):
  - Split the plan into a public/day zone (entry, living, dining, kitchen) and a private/night zone (bedrooms, bathrooms).
  - A hallway buffers the two zones.
  - Guests should never cross the bedroom zone to reach common rooms.
  - The entry should not sit next to the main bedroom.
  - Keep corridors short.
- [Houzz: key measurements for a patio](https://www.houzz.com/magazine/key-measurements-for-designing-your-perfect-patio-stsetivw-vs~89359139):
  - Bistro set: at least 1.8 × 2.4 m.
  - Dining for 4: about 3 × 3 m. Dining for 6: 3.2 × 3.8 m, ideally 3.7 × 4.3 m.
  - Fire pit lounge: about 4.6 × 4.6 m.
  - Grill: at least 1.2 m from the house, with 0.6–1.0 m clear around it.
  - Leave 0.75 m from a table edge to the edge of the patio.
- [Morel Landscaping: backyard layout planning](https://morellandscaping.com/2026/09/14/backyard-layout-planning/) and [Ovios: patio layout guide](https://www.ovios-home.com/blogs/news/patio-layout-ideas-backyard-design-guide):
  - A patio is about 25–30% of the yard.
  - Plan 3–4 zones: lounge, cook/dine, recreation (lawn, pool, play) and quiet/planting.
  - Paths are 0.9–1.2 m wide.
  - Use planting beds and hedges as dividers and for privacy along the fence.

## Roblox Creator Store: free public house models

Each model was inserted into an empty Studio place (scripts sandboxed), measured with a Luau scan, and deleted afterwards.

The scan measured:
- the bounding box;
- counts of parts, meshes and scripts;
- room and furniture names, positions and sizes;
- scripts matched against backdoor patterns (`require(<id>)`, `getfenv`, `loadstring`, `InsertService`, `HttpService`, escaped bytecode).

Roblox builds are about 1.2–1.4× real-world scale, so I used their **relative** layout, not raw sizes.

| Asset | Verdict | Why |
|---|---|---|
| [138171138697740](https://create.roblox.com/store/asset/138171138697740) "Partially Furnished Modern Suburban House" | **Accept: best reference** | A real house: about 16.5 × 19.5 m footprint, two floors with stairs, 80 doors and 75 windows. It has an attached two-car garage at the front with the garage door facing the street. The kitchen block (fridge, stove, oven, sink, cabinets) sits next to the dining table, and the sofa faces a wall-mounted TV in the living room. Closets are in the bedrooms, and bathrooms have their own sinks and showers. Its 45 scripts are all named interaction scripts (doors, drawers, fridge, garage), none flagged. |
| [77726082290440](https://create.roblox.com/store/asset/77726082290440) "Small House Modern Exterior Furnished" | **Accept: small single-storey reference** | Compact, about 13.7 × 10.6 m: queen bed, bathroom (toilet, shower, sink), living sofa, dining table for 4–6, and an **outdoor metal table and chairs outside the glazed wall**, i.e. a patio off the living area. Its tags mention yard, patio, porch, lawn and landscaping. 32 scripts, none flagged. |
| [16303517847](https://create.roblox.com/store/asset/16303517847) "Modern House (FURNISHED)" | **Partial: it's a house, but a poor layout source** | A real house (about 19.5 × 26.9 m, 12 doors, a bathroom and an outdoor grill), but 6,091 parts that are mostly small props (PC internals, a VCR, a guitar) under junk names ("shrek", "carl", "ddddddddd"). There are no named rooms, so the layout can't be learned from it. No scripts flagged. |
| [13147552882](https://create.roblox.com/store/asset/13147552882) "Modern House [Furnished]" | **Reject as a design reference** | About 12 × 10 m on two floors, but cramped and badly planned. The toilet and shower open straight off the couch and desk area, the bed is a sleeping bag, and the TV desk is jammed against a wall in the living space. It's a house, but it shows bad practice. |
| [80219563791402](https://create.roblox.com/store/asset/80219563791402) "🏠 Modern furnished house home interior design dec" | **Reject, not inserted** | Its description is copied word for word from 16303517847, so it's a re-upload by another account. |
| [89837083167645](https://create.roblox.com/store/asset/89837083167645) and [77646668089724](https://create.roblox.com/store/asset/77646668089724) "Brookhaven … Mansion Home Furnish" | **Reject, not inserted** | Emoji, keyword-stuffed titles with no description, from throwaway-looking accounts: the usual re-upload/spam pattern. |
| [98869693](https://create.roblox.com/store/asset/98869693) "Modern Glass House (2-Story Un Furnished)" | **Skip** | Unfurnished shell with no interior to learn from. |

## Patterns from the accepted models and the guidance

1. **The front faces the street.** Entry, porch and garage or driveway go on the front edge; private outdoor space goes at the back.
2. **The public zone sits behind the entry.** Living, dining and kitchen are open or adjacent. The kitchen is next to dining, and dining next to living.
3. **The private zone is grouped together.** Bedrooms cluster around a short hallway, a shared bathroom opens off that hallway, and an en-suite opens off the main bedroom.
4. **Indoor flows to outdoor.** A glazed or sliding wall on the living or kitchen side opens onto the patio. Outdoor dining sits next to the kitchen side, and the grill is set away from the wall.
5. **Furniture clusters by function.** The sofa faces the TV wall with a coffee table between. Kitchen pieces line the walls with a clear aisle. The bed's headboard is on a wall with walking space on both sides.

---

## RULES

- Rooms snap to a 0.5 m grid. Interior walls are shared, never overlapping, with no gaps between adjacent rooms.
- Sizes (m): living 4.5×5 to 6×7; kitchen 3×3.5 to 4×5; dining 3×3.5 to 4×4.5; main bedroom 3.6×4 to 4.5×5; bedroom 3×3 to 3.6×4; bathroom 2×2.5 to 2.5×3.5; en-suite 2×2.5; hallway 1.2 wide; entry 1.8×2.
- Never make a habitable room narrower than 2.2 m or smaller than 7 m²; hallways are 1.0–1.4 m wide.
- Zone it: entry → living/dining/kitchen (public) on one side, bedrooms + bathrooms (private) on the other, linked by a hallway.
- The kitchen must touch dining; dining must touch living (open plan allowed). The entry opens into living or a hall, never into a bedroom or bathroom.
- Bedrooms open off a hallway, not directly off living or kitchen; the shared bathroom also opens off the hallway; an en-suite opens only from its bedroom.
- Never route through one bedroom to reach another, or through a bathroom to reach anything.
- Doors are 0.9 m wide (0.8 for bathrooms); the front door is 1.0 m on an exterior wall facing the street (front edge); put doors at least 0.3 m from room corners.
- Give every habitable room at least 1 window on an exterior wall (window width ≈ 15–25% of that wall); bathrooms may have 1 small window; hallways need none.
- Living and kitchen get a wide opening (sliding door, 1.8–2.4 m) on the back wall onto the patio.
- Keep 0.9 m of clear walkway through every room from each door to the opposite side; don't block doors or windows with furniture.
- Living: sofa against a wall facing the TV on the opposite wall, 2.5–3.5 m apart; coffee table centered between them 0.45 m from the sofa; rug under the coffee table; plant in a corner.
- Kitchen: fridge, stove/counters and sink against walls; keep a 1.0–1.2 m aisle between counters or to the island; never put the stove under a window or next to the fridge.
- Dining: table centered in the room or by the kitchen, with 0.9 m clear on every side for chairs to pull out; a 1.0×1.8 m table seats 6.
- Bedroom: bed headboard against a wall (not under a window if avoidable), 0.6–0.9 m clear on both sides and at the foot; nightstand beside the bed; wardrobe/desk on another wall with 0.9 m in front.
- Bathroom: toilet, sink and shower/bath along walls; 0.6 m clear in front of the toilet and sink; no other furniture.
- Outdoor zones are separate named areas outside the house footprint: front yard (street side), backyard (rear), side yards optional.
- Front yard: 4–6 m deep; front path 1.2 m wide from the front door to the street edge; driveway 3 m wide per car (6 m for two) from the garage or street; lawn + low shrubs; mailbox by the street.
- Backyard: 8–15 m deep, spanning the house width; patio/deck directly against the living/kitchen back wall = 25–30% of the backyard area.
- Patio: dining for 4 needs 3×3 m and for 6 needs 3.7×4.3 m; a lounge set needs 3.5×3.5 m; leave 0.75 m from furniture to the patio edge.
- Grill: on the patio edge nearest the kitchen, ≥1.2 m from the house wall, 0.9 m clear around it.
- Fire pit: in a lounge zone ≥3 m from the house, chairs in a ring 2–2.5 m from its center.
- Lawn: the open central/rear area of the backyard (≥40% of it) for play; keep it free of furniture except a play set or a few trees.
- Garden beds: 0.6–1.2 m wide strips along the fence lines and the patio edges; trees in the back corners ≥2 m from the house.
- Pool: rectangle 3–5 m × 6–10 m in the back half of the backyard, ≥2 m from the house, ≥1.5 m from the fence, surrounded by a 1.2 m deck/coping; never in the front yard.
- Fence: on the backyard perimeter (sides + rear), with a gate in a side yard; hedges can substitute along the sides.
- Paths 1.0–1.2 m wide connect the back door → patio → lawn/pool/garden; don't cross the lawn diagonally.
- For a prompt that asks for an outdoor feature (backyard, pool, garden, deck), always place it explicitly with these sizes; never drop it silently.
