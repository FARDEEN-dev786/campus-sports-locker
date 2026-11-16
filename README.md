# Sports Equipment Lending Portal — NSUT

Operating Systems mini project: **Process Synchronization using Semaphores**.

Made by Mohd Fardeen, Lakshay and Anjali — Netaji Subhas University of Technology (NSUT), New Delhi.

## What it does

Students log in and borrow sports equipment from the college sports room. When a
student selects an item, one unit is locked for them for 10 minutes and every other
student sees it as locked straight away. A lock is removed when:

- the 10 minutes run out, or
- the student deselects it, or
- the final borrow confirmation (roll number check) fails.

Rules: maximum 3 items per student; some items need a partner item first
(for example a shuttlecock needs a badminton racket). Returning an item adds 1
back to its available count.

## How semaphores are used

- Each item's **available count** is a counting semaphore `S`.
- Selecting = `wait(S)` (S - 1). Deselect / timeout / failed confirmation / return = `signal(S)` (S + 1).
- **Level 1 (entry gate):** anyone who sees `S > 0` may click Select, so several students can get through at once.
- **Level 2 (critical section):** a mutex (database row lock) lets only one request at a time re-check `S` and take the unit. The first one in wins; the others see "Item unavailable currently — you have to wait".

The "Semaphore demo" page fires many simultaneous requests at one item to show this.

## Run locally

```sh
npm install
npm run dev
```
