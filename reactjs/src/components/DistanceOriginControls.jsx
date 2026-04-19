import { ui } from "../ui";

export default function DistanceOriginControls({
  addressValue,
  onAddressChange,
  onUseAddress,
  onUseCurrentLocation,
  onClearLocation,
  addressLoading = false,
  currentLocationLoading = false,
  hasLocation = false,
}) {
  return (
    <div className="mt-4 grid gap-3">
      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
          Distance origin
        </span>
        <input
          className={ui.input}
          type="text"
          placeholder="Enter an address, for example 12 Nguyen Hue, District 1"
          value={addressValue}
          onChange={(event) => onAddressChange(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className={ui.primaryButton + " !text-xs !px-3 !py-2"}
          type="button"
          onClick={onUseAddress}
          disabled={addressLoading}
        >
          {addressLoading ? "Searching..." : "Use address"}
        </button>
        <button
          className={ui.secondaryButton + " !text-xs !px-3 !py-2"}
          type="button"
          onClick={onUseCurrentLocation}
          disabled={currentLocationLoading}
        >
          {currentLocationLoading ? "Locating..." : "Use current location"}
        </button>
        {hasLocation ? (
          <button
            className={ui.ghostButton + " !text-xs !px-3 !py-2"}
            type="button"
            onClick={onClearLocation}
          >
            Clear
          </button>
        ) : null}
      </div>

      <p className="text-xs leading-6 text-stone-500">Address search is powered by OpenStreetMap.</p>
    </div>
  );
}
