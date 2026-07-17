"use client";

import Image, { type ImageLoader } from "next/image";

const signedLoader: ImageLoader = ({ src }) => src;

export function PrivateImage({ src, alt }: { src: string; alt: string }) {
  return <Image loader={signedLoader} unoptimized src={src} alt={alt} width={512} height={512} />;
}
