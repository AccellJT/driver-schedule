export function AttestationBlock({
  driverName,
  accepted,
}: {
  driverName: string;
  accepted: boolean;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Final attestation
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        This section confirms the contractor acknowledges these terms and fully attests that the information provided is truthful and complete.
      </p>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 h-4 w-4 rounded border ${
              accepted ? "border-green-600 bg-green-600" : "border-zinc-400 bg-white dark:bg-zinc-900"
            }`}
          />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {driverName} acknowledges the contractor terms above and fully attests that the submission is truthful and complete.
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {accepted
                ? "All required acknowledgements and the electronic signature are complete."
                : "Complete each acknowledgement above and enter the typed signature to finish this final attestation."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
