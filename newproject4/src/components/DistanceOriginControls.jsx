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
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
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

        <div className="flex items-end">
          <button className={ui.primaryButton} type="button" onClick={onUseAddress}>
            {addressLoading ? "Searching..." : "Use address"}
          </button>
        </div>

        <div className="flex items-end">
          <button className={ui.secondaryButton} type="button" onClick={onUseCurrentLocation}>
            {currentLocationLoading ? "Locating..." : "Use current location"}
          </button>
        </div>

        {hasLocation ? (
          <div className="flex items-end">
            <button className={ui.secondaryButton} type="button" onClick={onClearLocation}>
              Clear
            </button>
          </div>
        ) : null}
      </div>

      <p className="text-xs leading-6 text-stone-500">Address search is powered by OpenStreetMap.</p>
    </div>
  );
}
