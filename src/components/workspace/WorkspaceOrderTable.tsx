import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox } from "lucide-react";
import type { BackendOrder } from "../../api/auth";
import { useTranslate, useValueText } from "../../i18n";
import { kgToMon, taka } from "../../market/marketData";
import { EmptyState } from "../EmptyState";
import { EscrowPill } from "../market/MarketBits";
import { escrowStateOf, orderReference, STAGE_LABEL, stageOfOrder } from "./orderStages";

/**
 * The order table both workspaces show: the farmer's "Sales & escrow" and the buyer's "My orders".
 * One implementation, so the two can never label the same stage differently.
 *
 * The value column is the caller's own side of the order: what the farmer earns, or what the buyer
 * paid. It is passed in rather than derived here, because the split is the server's to compute.
 */

export function WorkspaceOrderTable({
  emptyAction,
  emptyHint,
  emptyTitle,
  orders,
  valueOf,
  valueLabel,
}: {
  emptyAction?: ReactNode;
  emptyHint: string;
  emptyTitle: string;
  orders: BackendOrder[];
  valueLabel: string;
  valueOf: (order: BackendOrder) => number;
}) {
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();

  if (orders.length === 0) {
    return <EmptyState icon={Inbox} title={t(emptyTitle)} hint={t(emptyHint)} action={emptyAction} />;
  }

  return (
    <div className="panel table-card">
      <div className="table-scroll">
        <div className="order-table">
          <div className="order-table-head" role="row">
            <span>{t("Order")}</span>
            <span>{t("Lot")}</span>
            <span>{t(valueLabel)}</span>
            <span>{t("Escrow")}</span>
            <span>{t("Stage")}</span>
            <span>{t("Action")}</span>
          </div>
          {orders.map((order) => (
            <div className="order-table-row" key={order.id} role="row">
              <span className="mono-figure">{v(orderReference(order))}</span>
              <span>
                {order.items
                  .map((item) => `${t(item.crop.name)} · ${v(Math.round(kgToMon(Number(item.quantityKg))))} ${t("mon")}`)
                  .join(", ")}
              </span>
              <span className="mono-figure">{v(taka(valueOf(order)))}</span>
              <span>
                <EscrowPill state={escrowStateOf(order)} />
              </span>
              <span>{t(STAGE_LABEL[stageOfOrder(order)])}</span>
              <span>
                <button className="secondary-button" type="button" onClick={() => navigate(`/orders/${order.id}`)}>
                  {t("Track")}
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
