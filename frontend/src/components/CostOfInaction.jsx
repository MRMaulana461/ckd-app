// components/CostOfInaction.jsx
//
// NEW component. Implements the pipeline diagram's dedicated
// "Cost of Inaction Calculator" box — separate from the general cost
// engine. Shows, in plain numbers, how much the active scenario saves (or
// costs extra) compared to "Do Nothing".
import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, SectionLabel } from './UiPrimitives';

export default function CostOfInaction({ costOfInaction, scenarioLabel }) {
  if (!costOfInaction) return null;

  const isSaving = costOfInaction.interpretation === 'savings_by_acting';
  const amount = Math.abs(costOfInaction.cost_of_inaction_usd);

  return (
    <div className={`rounded-lg border p-5 ${isSaving ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isSaving ? (
            <TrendingDown className="w-4 h-4 text-green-700" />
          ) : (
            <TrendingUp className="w-4 h-4 text-red-700" />
          )}
          <SectionLabel>Cost of Inaction Calculator</SectionLabel>
        </div>
        <Badge color={isSaving ? 'green' : 'red'}>{scenarioLabel} vs. Do Nothing</Badge>
      </div>

      <p className={`text-3xl font-semibold mb-1 ${isSaving ? 'text-green-800' : 'text-red-800'}`}>
        ${amount.toLocaleString()} / yr
      </p>
      <p className={`text-sm ${isSaving ? 'text-green-700' : 'text-red-700'}`}>
        {isSaving
          ? `Choosing "${scenarioLabel}" over "Do Nothing" avoids this much population-level cost per year.`
          : `"${scenarioLabel}" currently costs more than "Do Nothing" by this amount per year.`}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-current/10">
        <div>
          <p className="text-xs opacity-70">Do Nothing — total cost</p>
          <p className="text-sm font-medium">${costOfInaction.do_nothing_total_cost.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs opacity-70">{scenarioLabel} — total cost</p>
          <p className="text-sm font-medium">${costOfInaction.active_scenario_total_cost.toLocaleString()}</p>
        </div>
      </div>

      <p className="text-xs opacity-60 font-mono mt-3">{costOfInaction.formula}</p>
    </div>
  );
}
