import { cn } from "../../lib/cn";

/**
 * AdminFormGrid — 2-column form layout for admin detail/edit views.
 * Desktop: 2-col grid; mobile: stacked. Labels always above inputs.
 *
 * @param {React.ReactNode} props.children
 * @param {string}          [props.className]
 * @param {number}          [props.cols=2]  — number of columns (1 or 2)
 */
export function AdminFormGrid({ children, className, cols = 2 }) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-4",
        cols === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * AdminFormGrid.Full — child that spans full width inside the grid.
 */
AdminFormGrid.Full = function AdminFormGridFull({ children, className }) {
  return <div className={cn("sm:col-span-2", className)}>{children}</div>;
};

export default AdminFormGrid;
