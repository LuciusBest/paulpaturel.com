# Large Assets Audit

| Asset | Size | Notes |
| --- | ---: | --- |
| images/CamilleLeprince_Site/CAMILLE_LEPRINCE.FR.mp4 | 28.1 MB | Hero video for Camille Leprince; consider exporting a lighter 720p loop or trimming duration. No change applied (behaviour tightly coupled to project). |
| images/STENCIL_POSTER/StencilPoster3D.mp4 | 12.0 MB | 3D visualisation loop; recommend re-encoding with modern H.265/VP9 and stripping metadata. |
| images/LOTTOFPRINTS/LOTTOFPRINT_JINGLE_WEB.mp4 | 8.2 MB | Motion loop; could be re-exported at 1080p with ~4 Mbps bitrate. |
| images/STENCIL_POSTER/IMG_8419.mp4 | 6.6 MB | Autoplay video. Lossless metadata removal via `ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4` advised. |
| images/STENCIL_POSTER/IMG_8477.mp4 | 4.0 MB | Looping video; same metadata strip recommendation as above. |
| images/SENS_UNIK/SENS_UNIK_VIDEO.mp4 | 2.0 MB | Acceptable but still metadata-heavy; rewrap with `ffmpeg -movflags faststart`. |

Smaller stills (<1 MB) largely WebP; further savings would require lossy re-export which is outside “no visual change”.
