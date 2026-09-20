import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Stepper } from '../components/Stepper';
import type { Claim } from '../types';

const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Other'];
const MODES = ['Air', 'Train', 'Road', 'Mixed'];

export function RequestFormPage() {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [openCities, setOpenCities] = useState(false);
  const [departureDate, setDepartureDate] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('');
  const [modeOfTransport, setModeOfTransport] = useState('');
  const [estimatedRupees, setEstimatedRupees] = useState('');
  const [advanceRupees, setAdvanceRupees] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const cities = CITIES.filter((c) => c.toLowerCase().includes(destinationQuery.toLowerCase()));
  const missing =
    [purpose, destination, departureDate, numberOfDays, modeOfTransport, estimatedRupees].filter(Boolean).length < 6
      ? `${6 - [purpose, destination, departureDate, numberOfDays, modeOfTransport, estimatedRupees].filter(Boolean).length} required fields left`
      : 'Ready to submit';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const claim = await api<Claim>('/api/claims/request', {
        method: 'POST',
        body: JSON.stringify({
          category: 'DOMESTIC_TRAVEL',
          purpose,
          destination,
          departureDate,
          numberOfDays: Number(numberOfDays),
          modeOfTransport,
          estimatedRupees: Number(estimatedRupees),
          advanceRupees: Number(advanceRupees || 0),
        }),
      });
      navigate(`/claims/${claim.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit request');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white border border-line rounded-xl p-5">
        <p className="text-xs text-muted mb-3">What happens after you submit</p>
        <Stepper status="PENDING_RM" />
      </div>
      <form className="bg-white border border-line rounded-xl p-5 space-y-4" onSubmit={onSubmit}>
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        <p className="text-xs bg-green-50 text-brand rounded-lg px-3 py-2">
          Pack trip (select these): destination <strong>Bengaluru</strong>, departure <strong>2026-06-16</strong>,{' '}
          <strong>5</strong> days, mode <strong>Air</strong>, estimate <strong>48000</strong>, advance <strong>20000</strong>.
          Wrong city still submits, but the 15-mail inbox only attaches for Bengaluru.
        </p>
        <label className="block text-sm">
          Purpose of visit *
          <textarea
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="mt-1 w-full border border-line rounded-lg px-3 py-2"
            rows={3}
            placeholder="Vertex account review and plant visit"
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm relative">
            Destination *
            <input
              required
              value={destinationQuery || destination}
              onChange={(e) => {
                setDestinationQuery(e.target.value);
                setDestination('');
                setOpenCities(true);
              }}
              onFocus={() => setOpenCities(true)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2"
              placeholder="Type to search…"
            />
            {openCities && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-line rounded-lg shadow">
                {cities.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-green-50"
                      onClick={() => {
                        setDestination(c);
                        setDestinationQuery(c);
                        setOpenCities(false);
                      }}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>
          <label className="block text-sm">
            Departure date *
            <input
              required
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Number of days *
            <input
              required
              type="number"
              min={1}
              value={numberOfDays}
              onChange={(e) => setNumberOfDays(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Mode of transport *
            <select
              required
              value={modeOfTransport}
              onChange={(e) => setModeOfTransport(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Select…</option>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Estimated trip cost *
            <input
              required
              type="number"
              min={1}
              value={estimatedRupees}
              onChange={(e) => setEstimatedRupees(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Advance requested
            <input
              type="number"
              min={0}
              value={advanceRupees}
              onChange={(e) => setAdvanceRupees(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2"
            />
          </label>
        </div>
        <button
          disabled={busy}
          className="bg-brand text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60"
        >
          Submit request
        </button>
        <span className="text-xs text-muted ml-3">{missing}</span>
      </form>
    </div>
  );
}
