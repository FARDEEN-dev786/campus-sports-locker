# Campus Sports Locker

okay so for my Operating System mini project i have thought of a sports equipment lending system(webpage). it will use the process synchronization concept using semaphores to deal with multiple users selecting same item at the same time (like in the bookmyshow in which when one user just selects a seat it gets locked and other users cannot select it ,there are two ways by which this lock is removed . first is when the time runs out which is typically 10 minutes and second is when the final confirmation is failed) use the critical section problem concept , semaphores , process synchronization to tackle these type of problems. when someone selects an equipment then immediately in real time on the it shows locked on other users interface . for each user the maximum limit of equipments will be 3. the equipments consists of footballs, basketballs, tennis rackets, shuttle and 5 to 6 more items whatever standard things are there in any college. divide each equipment according to the sports category of it. there will be definite no. of any item. (also someone can only select a shuttle only if he has selected a racket  and make this functionality for other things that are similar to these ). when someone selects an item it gets locked for him for 10 minutes. so only 2 cases will be where this item gets unlocked for others first is when the 10 minutes window is over and second if the person deselect or fails to confirm his borrowing confirmation (keep track of count because if a user selected 1 tennis racket but there were 4 tennis rackets then other user can select 3 tennis rackets because only 1 is locked for now). now if 2 or more users try to click the select button almost simultaneously then do this, make 2 levels of semaphore. on the first level whoever can see the product available can click on it (this is where 2 or more user can select a single item) then on the second level only the first signal that got in will have the right to confirm and other will see "item unavailable currently and you have to wait" something like that on there screen. and also when something is given back to the system then you can increment its count. most important thing about this project is to use the concept of process synchronization and semaphores in it so after making the whole project you will have to also make a report word file in which the project report will be and how the web page operates will also be there

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a3d9a43a-cc3c-4987-9303-7ca141fb6cbe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
