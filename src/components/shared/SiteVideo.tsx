"use client";

import type { ComponentPropsWithRef } from "react";

/** Site controls own playback; the media element must not expose browser UI. */
export function SiteVideo(props: ComponentPropsWithRef<"video">) {
  return (
    <video
      {...props}
      data-site-video
      controls={false}
      controlsList="nodownload nofullscreen noplaybackrate noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={-1}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      style={{ ...props.style, pointerEvents: "none" }}
    />
  );
}
