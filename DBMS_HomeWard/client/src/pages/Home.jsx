import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import PetCard from '../components/PetCard.jsx';
import PetPhoto from '../components/PetPhoto.jsx';
import CampaignCard from '../components/CampaignCard.jsx';
import { useFavorites } from '../hooks/useFavorites.js';

const STEPS = [
  ['Browse', 'Filter pets by species, age and whether they are still available.'],
  ['Save', 'Tap the heart on any pet to keep a shortlist in your dashboard.'],
  ['Apply', 'Tell the shelter about your home and why this pet fits it.'],
  ['Track', 'Watch your application move from pending to approved.'],
];

export default function Home() {
  const [pets, setPets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const { favoriteIds, toggleFavorite } = useFavorites();

  useEffect(() => {
    api('/pets?status=available&limit=4')
      .then((data) => setPets(data.pets))
      .catch(() => setPets([]));
    api('/campaigns?limit=3')
      .then((data) => setCampaigns(data.campaigns))
      .catch(() => setCampaigns([]));
  }, []);

  const collage = pets.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="container-page grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div>
          <h1 className="text-5xl font-extrabold sm:text-6xl lg:text-7xl">
            Meet the pets waiting for a home near you.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">
            Homeward lists every animal at the shelter in one place. Find one you like, send an
            application in a few minutes and follow its progress online.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/pets" className="btn-primary px-6 py-3 text-base">
              See available pets
            </Link>
            <Link to="/register" className="btn-outline px-6 py-3 text-base">
              Create an account
            </Link>
          </div>
        </div>

        {/* Photo collage from the newest pets */}
        <div className="grid h-[380px] grid-cols-2 grid-rows-2 gap-3 sm:h-[440px]">
          {collage.length === 0 ? (
            <div className="col-span-2 row-span-2 flex items-center justify-center rounded-3xl border-2 border-dashed border-line text-muted">
              Pets you add will show up here
            </div>
          ) : (
            collage.map((pet, i) => (
              <Link
                key={pet._id}
                to={`/pets/${pet._id}`}
                className={`overflow-hidden rounded-3xl border-2 border-ink ${i === 0 ? 'row-span-2' : ''} ${
                  collage.length === 1 ? 'col-span-2' : ''
                } ${collage.length === 2 && i === 1 ? 'row-span-2' : ''}`}
              >
                <PetPhoto pet={pet} />
              </Link>
            ))
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y-2 border-line bg-paper">
        <div className="container-page py-14">
          <h2 className="text-3xl font-extrabold sm:text-4xl">How adoption works here</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="border-t-4 border-ink pt-4">
                <span className="font-display text-sm font-extrabold text-clay">Step {i + 1}</span>
                <h3 className="mt-1 text-2xl font-extrabold">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Newest pets */}
      <section className="container-page py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Recently arrived</h2>
          <Link to="/pets" className="font-semibold text-forest underline underline-offset-4 hover:text-forest-dark">
            View all pets
          </Link>
        </div>
        {pets.length === 0 ? (
          <p className="mt-6 text-muted">
            No pets listed yet. Run <code className="rounded bg-sage px-1.5">npm run seed</code> in the
            server folder to add samples.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pets.map((pet) => (
              <PetCard
                key={pet._id}
                pet={pet}
                isFavorite={favoriteIds.has(pet._id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </section>

      {/* Fundraisers */}
      {campaigns.length > 0 && (
        <section className="border-y-2 border-line bg-sage">
          <div className="container-page py-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold sm:text-4xl">Fundraisers ending soon</h2>
                <p className="mt-2 max-w-lg text-muted">Vet bills, food and repairs. Every rupee goes to a named need.</p>
              </div>
              <Link to="/campaigns" className="font-semibold text-forest underline underline-offset-4 hover:text-forest-dark">
                See all fundraisers
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => (
                <CampaignCard key={c._id} campaign={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing band */}
      <section className="container-page mt-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-forest p-8 text-paper sm:flex-row sm:items-center sm:p-12">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Need to rehome a pet?</h2>
            <p className="mt-2 max-w-md text-paper/85">
              List them here with photos. Our team checks every listing, then you choose the adopter yourself.
            </p>
          </div>
          <Link to="/listings/new" className="btn bg-sun px-6 py-3 text-base text-ink hover:bg-paper">
            List a pet
          </Link>
        </div>
      </section>
    </>
  );
}
