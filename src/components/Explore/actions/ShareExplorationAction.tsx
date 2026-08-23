import React, { useState } from "react";
import { useLocation } from "react-use";

import { Button } from "@grafana/ui";

import { TraceExploration } from "../../../pages/Explore";
import { getUrlForExploration } from "../../../utils/utils";

interface ShareExplorationActionState {
  exploration: TraceExploration;
}

export const ShareExplorationAction = ({
  exploration,
}: ShareExplorationActionState) => {
  const { origin } = useLocation();
  const [tooltip, setTooltip] = useState("Copy url");

  const onShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(origin + getUrlForExploration(exploration));
      setTooltip("Copied!");
      setTimeout(() => {
        setTooltip("Copy url");
      }, 2000);
    }
  };

  return (
    <Button
      size="sm"
      variant={"secondary"}
      icon={"share-alt"}
      tooltip={tooltip}
      onClick={onShare}
    />
  );
};
