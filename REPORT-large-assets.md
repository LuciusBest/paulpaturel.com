# Large Assets Audit

| Asset | Size | Notes |
| --- | ---: | --- |
| images/GRIME_INDEX/GrimeIndexScreenRecordWEB.mp4 | 73.9 MB | Largest public payload. Tested H.264 1280px / 30 fps / CRF 28 / no audio / faststart: 10.5 MB candidate, ~86% smaller. Review visually before replacing source. |
| images/UV_OBISTRIPE/UV_OBISTRIPE_02.png | 54.7 MB | Not referenced by `index.html`; `.webp` equivalent is 514 KB. Excluded from build output, source retained. |
| images/UV_OBISTRIPE/UV_OBISTRIPE_03.png | 34.7 MB | Not referenced by `index.html`; `.webp` equivalent is 742 KB. Excluded from build output, source retained. |
| images/CamilleLeprince_Site/CAMILLE_LEPRINCE.FR.MP4 | 28.1 MB | Hero video for Camille Leprince; consider exporting a lighter 720p loop or trimming duration. No change applied (behaviour tightly coupled to project). |
| images/UV_OBISTRIPE/UV_OBISTRIPE_01.png | 22.9 MB | Not referenced by `index.html`; `.webp` equivalent is 574 KB. Excluded from build output, source retained. |
| images/STENCIL_POSTER/StencilPoster3D.MP4 | 12.0 MB | 3D visualisation loop; recommend re-encoding with modern H.265/VP9 and stripping metadata. |
| images/LOTTOFPRINTS/LOTTOFPRINT_JINGLE_WEB.MP4 | 8.2 MB | Motion loop; could be re-exported at 1080p with ~4 Mbps bitrate. |
| images/STENCIL_POSTER/IMG_8419.MP4 | 6.6 MB | Autoplay video. Lossless metadata removal via `ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4` advised. |
| images/UV_OBISTRIPE/UV_OBISTRIPE_00.png | 4.9 MB | Not referenced by `index.html`; `.webp` equivalent is 617 KB. Excluded from build output, source retained. |
| images/STENCIL_POSTER/IMG_8477.MP4 | 4.0 MB | Looping video; same metadata strip recommendation as above. |
| images/SENS_UNIK/SENS_UNIK_VIDEO.MP4 | 2.0 MB | Acceptable but still metadata-heavy; rewrap with `ffmpeg -movflags faststart`. |
| images/LAMANT/lamant_cover.jpg | 1.7 MB | Not referenced by `index.html`; `.webp` version is used. Excluded from build output, source retained. |

## Tested video candidates

Generated outside the repo in `/private/tmp/paulpaturel-asset-test/` for review, with:

```bash
ffmpeg -i input.mp4 -vf scale='min(1280\,iw)':-2 -r 30 -an -c:v libx264 -preset medium -crf 28 -movflags +faststart output.mp4
```

| Asset | Current | Candidate | Change |
| --- | ---: | ---: | ---: |
| GrimeIndexScreenRecordWEB.mp4 | 73.9 MB | 10.5 MB | -86% |
| CAMILLE_LEPRINCE.FR.MP4 | 28.1 MB | 4.0 MB | -86% |
| StencilPoster3D.MP4 | 12.0 MB | 2.5 MB | -79% |

## Source test implementation

`src/index.html` now points to `_light.mp4` versions for the heavy videos. The original heavy videos are retained in `src/` and excluded from `public/` during build.

| Original | Source test file |
| --- | --- |
| images/STENCIL_POSTER/IMG_8419.MP4 | images/STENCIL_POSTER/IMG_8419_light.mp4 |
| images/STENCIL_POSTER/StencilPoster3D.MP4 | images/STENCIL_POSTER/StencilPoster3D_light.mp4 |
| images/STENCIL_POSTER/IMG_8477.MP4 | images/STENCIL_POSTER/IMG_8477_light.mp4 |
| images/SENS_UNIK/SENS_UNIK_VIDEO.MP4 | images/SENS_UNIK/SENS_UNIK_VIDEO_light.mp4 |
| images/GRIME_INDEX/GrimeIndexScreenRecordWEB.mp4 | images/GRIME_INDEX/GrimeIndexScreenRecordWEB_light.mp4 |
| images/CamilleLeprince_Site/CAMILLE_LEPRINCE.FR.MP4 | images/CamilleLeprince_Site/CAMILLE_LEPRINCE.FR_light.mp4 |
| images/LOTTOFPRINTS/LOTTOFPRINT_JINGLE_WEB.MP4 | images/LOTTOFPRINTS/LOTTOFPRINT_JINGLE_WEB_light.mp4 |

Smaller stills (<1 MB) largely WebP; further savings would require lossy re-export which is outside “no visual change”.
