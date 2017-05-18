SteamControllerTracker
======================
An offshot of the SteamControllerSigner that aims to take advantage of the SC's dual pulse channel nature.

Benefits over the Steam Controller Singer
-----------------------------------------
* Uses tracker files instead of MIDI, which has more precise time divisions than MIDI (lines and ticks instead of arbitrary timestamps)
* Support for multiple Steam Controllers
* Support for a number of tracker effects (note slide, vibrato, arpeggio, etc.)
* Instruments can be mapped to various duty cycles (so they actually sound a bit different) and even pulses of various intensity (for percussions)
* Channels can selected and pitch can be shifted without having to alter the file

Setup
-----
If you already have Node.js (which you can download from [here][2]), just download a copy of the source on Github,
run `npm install` in the directory and run `node play_mod.js`.

Why do I need Node.js?
----------------------
Mistakes were made. Node had some pretty handy tools and libraries to deal with device I/O when I started this out. I didn't realize
just how inconveinient node would turn out to be if I needed to show this to people it's too late now to switch to, say, Python.

What file formats can I use?
----------------------------
In theory, any format supported by libopenmpt. According to their documentation, this means any of the following :

`mod s3m xm it mptm stm nst m15 stk wow ult 669 mtm med far mdl ams dsm amf okt dmf ptm psm mt2 dbm digi imf j2b gdm umx plm pt36 sfx sfx2 mms mo3 xpk ppm mmcmp`

Can I use this to play MIDI?
----------------------------
No, MIDI as a whole is not especially well suited for playing music on devices other than proper music synthetizers.
Tracker modules are better suited to this kind of use since managing channels for multiple reasons, and while support
for MIDI could be added to this project, you're probably better off using Pilatomic's [SteamControllerSigner][1] for now.

Can I use this to play NSF or SPC?
----------------------------------------
While those formats would be well suited to playing music on the Steam Controller as well,
those formats are not supported at the moment. You would need to convert those into something
like XM or the like first.

External documentation
----------------------
* [steamy, by meh](https://github.com/meh/steamy/blob/master/controller/README.md)
* [SteamControllerSigner, by Pilatomic](https://gitlab.com/Pilatomic/SteamControllerSinger/blob/master/main.cpp)
* [scraw, by dennis-hamester](https://dennis-hamester.gitlab.io/scraw/protocol/)
* [sc-controller, by kozec](https://github.com/kozec/sc-controller/blob/master/scc/drivers/sc_dongle.py)

[1]:https://sourceforge.net/projects/steam-controller-singer/
[2]:https://nodejs.org
[3]:https://github.com/sm-Fifteen/SteamControllerTracker/releases
