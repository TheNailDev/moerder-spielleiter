/* Variablen- und Grundsetup */
var version = "V1.2-20230325-RC13";
var speicherversion = 1;
var speicherstand;
var running = false;
var schrittuhr_intervall, schrittuhr_sek;
var kartenliste;
//folgendes wird auch gespeichert:
var leute, rollen, rids, einstellungen;
var spieleranzahl, rollenanzahl, tagzahl, nachtzahl;
var leutesammler, auswahl, entscheidung;
var cphase, crolle, cschritt;
var Tagesaktionen, SpielerToeten, TagLynchen; //TagLynchen scheint eine Karteileiche zu sein :/

window.addEventListener('load', function(e) {
	document.getElementById('vinfo').innerHTML = version;
	window.applicationCache.update();
	window.applicationCache.addEventListener('updateready', function(e) {
		if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
			window.applicationCache.swapCache();
			if (!spielstand_vorhanden() && confirm("Ein Update für die WebApp ist vorhanden - Seite neu laden und es aktivieren?"))
			{
				document.location.reload();
			}
		}
	}, false);
}, false);

window.onbeforeunload = function(e) {
	if (running)
	{
		var msg = 'WebApp wirklich beenden?';
		e.returnValue = msg;
		return msg;
	}
}

/* Klassendefinitionen und -funktionen */
function rolle()
{
	this.rolleID = rollen.length;
	//AUTO, ID und Arrayindex

	this.name = "Neue Rolle"; //Bezeichnung
	this.strid = "neu"; //kurzer Bezeichnungsstring
	//werden durch Rollendefinition gesetzt
	
	this.imspiel = false; //Ist moeglicherweise im Spiel
	//relevant bei Rollen > Spieler, gibt an ob Karte im Pot war und sie jemand haben könnte
	
	this.notiert = false; //wurden einmalig aufgerufen zur Bestimmung
	//System kennt alle Spieler dieser Rolle?
	
	this.erwacht = true; //erwacht in der Nacht = wird aufgerufen
	//default true zur erstmaligen Notation, danach oder falls nur Aktion in erster Nacht -> false
	
	this.funktion_nacht = false; //Funktion, welche beim Aufruf bei Nacht ausgeführt wird
	//wird in jedem Schritt einer Rolle aufgerufen
	
	this.balance = 0; //Bewertung zur Spielbalance
	//Spielbalance zur groben Orientierung der Ausgewogenheit Gut<->Böse
	
	this.bekannt = 0; //Öffentlich bekannte gestorbene Rollenbesitzer
	//bei Tag gestorbene werden ggf. hier gezählt
	
	this.istboese = false; //Parteizugehörigkeit
	//ist die Rolle als böse Partei zu bewerten
	
	this.einzelrolle = true; //Ein-Spieler-Rolle
	//darf nur 1 Spieler diese Rolle innehaben oder mehrere (false = Parteienrolle)
	
	this.anzahl = 0; //wieviele haben diese Rolle inne
	//GEHEIM, wieviele gibt es wirklich von einer Rolle
	this.lebende = 0; //wieviele noch leben
	//GEHEIM, wieviele davon leben
	this.spieler = new Array();
	//GEHEIM, Sammlung der Spieler-IDs mit dieser Rolle
	this.werte = new Object();
	//GEHEIM, Sondereigenschaften, rollenspezifisch
}
function spieler()
{
	this.spielerID = leute.length;
	//AUTO, ID und Arrayindex
	
	this.name = "Neuer Spieler";
	//Bildschirmname
	
	this.rolle = -1;
	//Rolle, nichts = -1
	
	this.lebt = true;
	//eindeutig
	
	this.verstummt = false; //verstummt
	//darf nicht: reden, abstimmen, sich verteidigen
	
	this.waehlbar = true; //lynchbar, ernennbar ...
	//darf fuer irgendetwas gewaehlt werden
}
function NeueRolle(eigenschaften)
{
	var neu = new rolle();
	for (var schluessel in eigenschaften)
	{
		neu[schluessel] = eigenschaften[schluessel];
	}
	rids[eigenschaften["strid"]] = rollen.length;
	rollen.push(neu);
}
function NeuerSpieler(eigenschaften)
{
	var neu = new spieler();
	for (var schluessel in eigenschaften)
	{
		neu[schluessel] = eigenschaften[schluessel];
	}
	leute.push(neu);
}
function NeueEinstellung(setid, setwert, settext)
{
	einstellungen[setid] = new Object();
	einstellungen[setid].id = setid;
	einstellungen[setid].wert = setwert;
	einstellungen[setid].text = settext;
}

/* Erweiterungsfunktionen */
function contains(a, obj)
{
	for (var i = 0; i < a.length; i++) {
		if (a[i] == obj) {
			return true;
		}
	}
	return false;
}
if (!String.prototype.trim)
{
  String.prototype.trim = function (){return this.replace(/^\s+|\s+$/g,'');};  
}			
function striptags(html)
{
	var tmp = document.createElement("DIV");
	tmp.innerHTML = html;
	return tmp.textContent || tmp.innerText;
}
function supports_html5_storage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}
function spielstand_vorhanden()
{
	if (supports_html5_storage() && (typeof localStorage.NWWA_Speicherstand !== 'undefined') && localStorage.NWWA_Speicherstand) return true;
	return false;
}

/* Spielfunktionen */
function ErstelleSpeicherstand()
{
	var savegame = new Object();
	savegame.version = version; //wichtig zum Abgleich beim Laden!
	savegame.speicherversion = speicherversion; //wichtig zum Abgleich beim Laden!
	savegame.leute = leute;
	savegame.rollen = rollen;
	savegame.rids = rids;
	savegame.einstellungen = einstellungen;
	savegame.spieleranzahl = spieleranzahl;
	savegame.rollenanzahl = rollenanzahl;
	savegame.tagzahl = tagzahl;
	savegame.nachtzahl = nachtzahl;
	savegame.leutesammler = leutesammler;
	savegame.auswahl = auswahl;
	savegame.entscheidung = entscheidung;
	savegame.cphase = cphase;
	savegame.crolle = crolle;
	savegame.cschritt = cschritt;
	savegame.Tagesaktionen = Tagesaktionen;
	savegame.SpielerToeten = SpielerToeten;
	savegame.TagLynchen = TagLynchen;
	var jsonsavegame = JSON.stringify(savegame, function (key, value) {
												if (typeof value === 'function') {
													return "jsonfunc:"+value.toString();
												}
												return value;
											});
	return jsonsavegame;
}
function LadeSpeicherstand(jsonsavegame)
{
	var savegame = JSON.parse(jsonsavegame, function (key, value) {
						if (value && typeof value === "string" && value.substring(0,9)=="jsonfunc:")
						{
							var startBody = value.indexOf('{') + 1;
							var endBody = value.lastIndexOf('}');
							var startArgs = value.indexOf('(') + 1;
							var endArgs = value.indexOf(')');
							return new Function(value.substring(startArgs, endArgs), value.substring(startBody, endBody));
						}
						return value;
					});
	if (savegame.speicherversion!=speicherversion)
	{
		Anzeige_Hinweis('WARNUNG: Seit dem Speichern dieses Spiels gab es ein Update. Der Speicherstand ist mit der aktuellen Version vielleicht nicht kompatibel. Weiterspielen auf eigene Gefahr ;)');
		return false;
	}
	leute = savegame.leute;
	rollen = savegame.rollen;
	rids = savegame.rids;
	einstellungen = savegame.einstellungen;
	spieleranzahl = savegame.spieleranzahl;
	rollenanzahl = savegame.rollenanzahl;
	tagzahl = savegame.tagzahl;
	nachtzahl = savegame.nachtzahl;
	leutesammler = savegame.leutesammler;
	auswahl = savegame.auswahl;
	entscheidung = savegame.entscheidung;
	cphase = savegame.cphase;
	crolle = savegame.crolle;
	cschritt = savegame.cschritt;
	Tagesaktionen = savegame.Tagesaktionen;
	SpielerToeten = savegame.SpielerToeten;
	TagLynchen = savegame.TagLynchen;
	return true;
}

function SpielInit()
{
	leutesammler = new Array();
	spieleranzahl = 0;
	SpielReset();

	/* Einstellungen */
	einstellungen = new Object();
	//NeueEinstellung("dummysetting",true,"Ausführlicher Text");

	NeueEinstellung("hexe_eigenschutz",false,"Hexe darf sich selbst schützen");
	NeueEinstellung("amor_eigenwahl",true,"Amor darf sich selbst verkuppeln");
	NeueEinstellung("leibwaechter_eigenwahl",true,"Nachtwächter / Priester darf sich selbst schützen");
	NeueEinstellung("rolle_verliebt_bekanntgeben",true,"Beim Suizid aus Liebe wird bei Tag die Rolle bekanntgegeben");
	NeueEinstellung("rolle_lynchen_bekanntgeben",true,"Beim Lynchen wird die Rolle des Verstorbenen bekanntgegeben");
	NeueEinstellung("rollen_anzahlen_bekannt",true,"Anzahlen der Spieler pro Rolle bekannt");
	NeueEinstellung("rolle_tot_zugeben",false,"Zugeben, sobald eine Rolle ausgelöscht worden ist (nicht empfohlen)");

	NeueEinstellung("text_vorsicht_tot"," (Rolle ist bereits tot - warte eine Weile, um dies zu verschleiern)","Hilfstext");
	NeueEinstellung("text_vorsicht_aktionslos"," (keine Aktion möglich - warte eine Weile, um dies zu verschleiern)","Hilfstext");
	
	Anzeige_Menu(['spiel_hauptmenu']);
}

function SpielReset()
{
	window.scrollTo(0,1);
	leute = new Array(); //Array mit allen Spielerobjekten
	rollen = new Array(); //Array mit allen Rollenobjekten
	rids = new Object(); //Eigenschaften beinhalten Rollen-ID: rids["werwolf"] liefert Index von rollen-Array
	rollenanzahl = 0;
	
	/*
	Kurzanleitung - Implementierung einer neuen Rolle:
	-> Rolle mit NeueRolle() anlegen, dabei wegen Interaktion mit anderen Rollen auf Reihenfolge achten
	-> in Tagesaktionen() Tode bzw. Tagesnachrichten durch Rolle auslösen lassen
	-> in SpielerToeten() ggf. Todesverhinderung oder Sondertod durch/bei Rolle ergänzen
	*/
	
	/* Rollendefinitionen */
	//Eingebaut (in Reihenfolge): Amor, Günstling, Werwölfe, Nachtwächter / Priester, Alte Vettel, Hexe, Verfluchter, Seher, Prinz, Harter Bursche, Dorfbewohner
	NeueRolle({name:"Amor",strid:"amor",
				balance:-3,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								Anzeige_Auswahl("<q><b>Amor</b> erwacht. Er wird gleich zwei Spieler ineinander verlieben. Die Verliebten kennen einander und begehen sofort Suizid, sollte ihr Partner sterben.</q> <b>(Amor erfassen falls vorhanden)</b>",function(spieler){return HatKeineRolle(spieler);});
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									cschritt = 0;
									rollen[crolle].notiert = true;
								}
								break;
						}
					}
					if (rollen[crolle].notiert)
					{
						if (!IstRolleAufzurufen(crolle))
						{
							cschritt = 4;
						}
						switch (cschritt)
						{
							case 0:
								cschritt++;
								var rollentext = "<q><b>Welche zwei Spieler</b> möchte Amor verlieben? (gleichgeschlechtliche Beziehungen sind auch erlaubt, Eigenwahl "+(einstellungen["amor_eigenwahl"].wert?"erlaubt":"verboten")+")</q>";
								rollen[crolle].werte.verliebte = new Array();
								if (IstRolleInaktiv(crolle))
								{
									cschritt++;
									Anzeige_Notiz(rollentext+einstellungen["text_vorsicht_tot"].wert);
								}
								else
								{
									Anzeige_Auswahl(rollentext,function(spieler){if (einstellungen["amor_eigenwahl"].wert?true:spieler.rolle!=rids["amor"]) {return true;} else return false;});
								}
								break;
							case 1:
								if (Check_Auswahl(2,2,false))
								{
									rollen[crolle].werte.verliebte.push(auswahl[0],auswahl[1]);
									cschritt++;
									Schritt();
								}
								break;
							case 2:
								cschritt++;
								Anzeige_Notiz("<q>Amor hat seine Wahl getroffen und schläft wieder ein.</q>");
								break;
							case 3:
								cschritt++;
								var verliebte = leute[rollen[crolle].werte.verliebte[0]].name+" und "+leute[rollen[crolle].werte.verliebte[1]].name;
								var rollentext = "<q>Die Verliebten werden nun angetippt.</q><b>(Einmal um die Runde laufen und die beiden Verliebten leise antippen: "+verliebte+")</b><q>Sie erwachen und erkennen wie unsterblich verliebt ineinander sie doch sind. Anschließend schlafen sie wieder ein.</q>";
								Anzeige_Notiz(rollentext+(IstRolleInaktiv(crolle)?einstellungen["text_vorsicht_tot"].wert:""));
								break;
							case 4:
								rollen[crolle].erwacht = false;
								RolleEnde();
								break;
						}
					}
				},
				});
	NeueRolle({name:"Günstling",strid:"guenstling",
				balance:-6,
				istboese:true,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								Anzeige_Auswahl("<q>Der <b>Günstling</b> erwacht. Er steht auf der Seite der Werwölfe, verwandelt sich aber nicht und wird daher vom Seher auch nicht als Feind erkannt.</q> <b>(Günstling erfassen falls vorhanden)</b>",function(spieler){return HatKeineRolle(spieler);});
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									cschritt = 0;
									rollen[crolle].notiert = true;
								}
								break;
						}
					}
					if (rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								Anzeige_Notiz("<q>Zusätzlich erwachen nun alle Werwölfe und der Günstling gibt sich ihnen zu erkennen (z.b. durch Winken).</q>"+(rollen[crolle].spieler.length==0?"<b>(Signalisiere den Wölfen, dass es keinen Günstling gibt!)</b>":"")+"<q>Anschließend schlafen alle wieder ein.</q>");
								break;
							case 1:
								rollen[crolle].erwacht = false;
								RolleEnde();
								break;
						}
					}
				},
				});
	NeueRolle({name:"Mörder / Werwölfe",strid:"werwolf",
				balance:-6,
				istboese:true,
				einzelrolle:false,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								Anzeige_Auswahl("<q>Alle <b>Mörder / Werwölfe erwachen und erkennen sich gegenseitig</b>. Ihre Mission ist es, alle Dorfbewohner zu töten, um siegreich aus dem Spiel hervorzugehen.</q> <b>(Mörder / Werwölfe erfassen)</b>",function(spieler){return HatKeineRolle(spieler);});
								break;
							case 1:
								if (Check_Auswahl(0,-1,true))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									cschritt = 0;
									rollen[crolle].notiert = true;
								}
								break;
						}
					}
					if (rollen[crolle].notiert)
					{
						var zusatzwolf = ((rollen[rids["verfluchter"]].anzahl>0) && (rollen[rids["verfluchter"]].werte.istwolf));
						if (!IstRolleAufzurufen(crolle) && (!zusatzwolf))
						{
							cschritt = 3;
						}
						switch (cschritt)
						{
							case 0:
								cschritt++;
								Anzeige_Auswahl("<q>Mitten in der Nacht gehen die Mörder / Werwölfe auf die Jagd.</q><q>Sie einigen sich auf ihr <b>nächstes Opfer</b>...</q>",function(spieler){if (spieler.lebt) {return true;} else return false;});
								break;
							case 1:
								if (Check_Auswahl(0,1,true))
								{
									rollen[crolle].werte.ziele = new Array();
									for (var i in auswahl)
									{
										rollen[crolle].werte.ziele.push(auswahl[i]);
									}
									cschritt++;
									Schritt();
								}
								break;
							case 2:
								cschritt++;
								Anzeige_Notiz("<q>Die Mörder / Werwölfe haben ihre Wahl getroffen und schlafen wieder ein.</q>");
								break;
							case 3:
								RolleEnde();
								break;
						}
					}
				},
				});
	NeueRolle({name:"Krankenschwester / Nachtwächter / Priester",strid:"leibwaechter",
				balance:+3,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								rollen[crolle].werte.ziel = -1;
								rollen[crolle].werte.letztes_ziel = -1;
								Anzeige_Auswahl("<q>Die / Der <b>Krankenschwester / Nachtwächter / Priester</b> kann jede Nacht einen anderen zu beschützenden Spieler wählen, welcher dann in dieser Nacht durch nichts getötet oder verletzt werden kann.</q> <b>(Krankenschwester / Nachtwächter / Priester erfassen falls vorhanden)</b>",function(spieler){return HatKeineRolle(spieler);});
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									cschritt = 0;
									rollen[crolle].notiert = true;
								}
								break;
						}
					}
					if (rollen[crolle].notiert)
					{
						if (!IstRolleAufzurufen(crolle))
						{
							rollen[crolle].werte.ziel = -1;
							cschritt = 2;
						}
						switch (cschritt)
						{
							case 0:
								cschritt++;
								var rollentext = "<q>Die / Der Krankenschwester / Nachtwächter / Priester erwacht. <b>Wen</b> möchte sie / er in dieser Nacht beschützen? (nicht zweimal hintereinander dieselbe Person, Eigenwahl "+(einstellungen["leibwaechter_eigenwahl"].wert?"erlaubt":"verboten")+")</q>";
								AuswahlReset();
								if (IstRolleInaktiv(crolle))
								{
									Anzeige_Notiz(rollentext+einstellungen["text_vorsicht_tot"].wert);
									rollen[crolle].werte.ziel = -1;
								}
								else
								{
									Anzeige_Auswahl(rollentext,function(spieler){if (spieler.lebt && (einstellungen["leibwaechter_eigenwahl"].wert?true:spieler.rolle!=rids["leibwaechter"]) && (spieler.spielerID!=rollen[crolle].werte.letztes_ziel)) {return true;} else return false;});
								}
								break;
							case 1:
								if (Check_Auswahl(0,1,!IstRolleInaktiv(crolle)))
								{
									rollen[crolle].werte.ziel = (auswahl.length>0?auswahl[0]:-1);
									Anzeige_Notiz("<q>Die / Der Krankenschwester / Nachtwächter / Priester hat seine Wahl getroffen und schläft wieder ein.</q>");
									cschritt++;
								}
								break;
							case 2:
								RolleEnde();
								break;
						}
					}
				},
				});
	NeueRolle({name:"Alte Vettel",strid:"altevettel",
				balance:+1,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								Anzeige_Auswahl("<q>Die <b>Alte Vettel</b> verbreitet so schlimme Gerüchte, dass der betroffene Dorfbewohner sich am folgenden Tag nicht blicken lassen kann. Da er nicht anwesend ist, kann er weder etwas zur Diskussion beitragen noch kann gegen ihn gestimmt werden.</q> <b>(Alte Vettel erfassen falls vorhanden)</b>",function(spieler){return HatKeineRolle(spieler);});
								rollen[crolle].werte.ziel = -1;
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									cschritt = 0;
									rollen[crolle].notiert = true;
								}
								break;
						}
					}
					if (rollen[crolle].notiert)
					{
						if (!IstRolleAufzurufen(crolle))
						{
							rollen[crolle].werte.ziel = -1;
							cschritt = 3;
						}
						switch (cschritt)
						{
							case 0:
								cschritt++;
								var rollentext = "<q>Die Alte Vettel erwacht. <b>Über wen</b> möchte sie Gerüchte verbreiten? (Eigenwahl verboten)</q>";
								AuswahlReset();
								if (IstRolleInaktiv(crolle))
								{
									cschritt++;
									Anzeige_Notiz(rollentext+einstellungen["text_vorsicht_tot"].wert);
									rollen[crolle].werte.ziel = -1;
								}
								else
								{
									Anzeige_Auswahl(rollentext,function(spieler){if (spieler.lebt && (spieler.rolle!=rids["altevettel"])) {return true;} else return false;});
								}
								break;
							case 1:
								if (Check_Auswahl(0,1,true))
								{
									rollen[crolle].werte.ziel = (auswahl.length>0?auswahl[0]:-1);
									if (auswahl.length>0)
									{
										leute[auswahl[0]].verstummt = true;
										leute[auswahl[0]].waehlbar = false;
									}
									cschritt++;
									Schritt();
								}
								break;
							case 2:
								cschritt++;
								Anzeige_Notiz("<q>Die Alte Vettel hat ihre Wahl getroffen und schläft wieder ein.</q>");
								break;
							case 3:
								RolleEnde();
								break;
						}
					}
				},
				});
	NeueRolle({name:"Hexe",strid:"hexe",
				balance:+4,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								rollen[crolle].werte.retten = 1;
								rollen[crolle].werte.toeten = 1;
								rollen[crolle].werte.ziel_retten = -1;
								rollen[crolle].werte.ziel_toeten = -1;
								Anzeige_Auswahl("<q>Die <b>Hexe</b> kann einmalig nachts einen Spieler durch einen Heiltrank vor dem Tod oder der Verwandlung retten. Bis sie sich dafür entscheidet erfährt sie deshalb jede Nacht, wer von den Werwölfen angegriffen wird. Außerdem kann sie einmalig nachts einen Spieler mit einem Gifttrank töten.</q> <b>(Hexe erfassen falls vorhanden)</b>",function(spieler){return HatKeineRolle(spieler);});
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									cschritt = 0;
									rollen[crolle].notiert = true;
								}
								break;
						}
					}
					if (rollen[crolle].notiert)
					{
						if (!IstRolleAufzurufen(crolle))
						{
							rollen[crolle].werte.ziel_retten = -1;
							rollen[crolle].werte.ziel_toeten = -1;
							cschritt = 4;
						}
						var kann_retten = (rollen[crolle].werte.retten>0?true:false);
						var kann_toeten = (rollen[crolle].werte.toeten>0?true:false);
						switch (cschritt)
						{
							case 0:
								cschritt++;
								var kandidaten = new Array();
								for (var i in rollen[rids["werwolf"]].werte.ziele)
								{
									kandidaten.push(leute[rollen[rids["werwolf"]].werte.ziele[i]].name);
								}
								var kandidatentext = (kann_retten?(rollen[rids["werwolf"]].werte.ziele.length>0?kandidaten.join(", "):"keine!"):"kein Heiltrank übrig");
								var rollentext = "<q>Der Hexe erwacht und erfährt, wer diese Nacht von den Wölfen angegriffen wurde.</q><b>Signalisiere der Hexe die Todeskandidaten:</b> <i>"+kandidatentext+"</i><q>Möchte sie eine Person <b>retten</b>?</q>"+(kann_retten?"<b>"+(((einstellungen["hexe_eigenschutz"].wert==false) && contains(rollen[rids["werwolf"]].werte.ziele,rollen[crolle].spieler))?"(Eigenschutz verboten!) ":"")+"(falls nicht, einfach keinen Spieler auswählen)</b>":"");
								AuswahlReset();
								if (IstRolleInaktiv(crolle))
								{
									Anzeige_Notiz(rollentext+einstellungen["text_vorsicht_tot"].wert);
									rollen[crolle].werte.ziel_retten = -1;
								}
								else if (!kann_retten)
								{
									Anzeige_Notiz(rollentext+einstellungen["text_vorsicht_aktionslos"].wert);
									rollen[crolle].werte.ziel_retten = -1;
								}
								else
								{
									Anzeige_Auswahl(rollentext,function(spieler){if (contains(rollen[rids["werwolf"]].werte.ziele,spieler.spielerID)) {if ((einstellungen["hexe_eigenschutz"].wert==false) && contains(rollen[rids["hexe"]].spieler,spieler.spielerID)){return false;} else return true;} else return false;});
								}
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									rollen[crolle].werte.ziel_retten = (auswahl.length>0?auswahl[0]:-1);
									if (auswahl.length>0)
									{
										rollen[crolle].werte.retten--;
									}
									Anzeige_Notiz("<q>Die Hexe hat ihre Wahl getroffen.</q>");
									cschritt++;
								}
								break;
							case 2:
								cschritt++;
								var rollentext = (kann_toeten?"":"<b>Signalisiere der Hexe:</b> <i>kein Gifttrank übrig</i>")+"<q>Möchte sie eine Person <b>töten</b>?</q>"+(kann_toeten?"<b>(falls nicht, einfach keinen Spieler auswählen)</b>":"");
								if (IstRolleInaktiv(crolle))
								{
									Anzeige_Notiz(rollentext+einstellungen["text_vorsicht_tot"].wert);
									rollen[crolle].werte.ziel_toeten = -1;
									AuswahlReset();
								}
								else if (!kann_toeten)
								{
									Anzeige_Notiz(rollentext+einstellungen["text_vorsicht_aktionslos"].wert);
									rollen[crolle].werte.ziel_toeten = -1;
								}
								else
								{
									Anzeige_Auswahl(rollentext,function(spieler){if (spieler.lebt) {return true;} else return false;});
								}
								break;
							case 3:
								if (Check_Auswahl(0,1,false))
								{
									rollen[crolle].werte.ziel_toeten = (auswahl.length>0?auswahl[0]:-1);
									if (auswahl.length>0)
									{
										rollen[crolle].werte.toeten--;
									}
									Anzeige_Notiz("<q>Die Hexe hat ihre Wahl getroffen und schläft wieder ein.</q>");
									cschritt++;
								}
								break;
							case 4:
								RolleEnde();
								break;
						}
					}
				},
				});
	NeueRolle({name:"Verfluchter",strid:"verfluchter",
				balance:-3,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								rollen[crolle].werte.istwolf = false;
								Anzeige_Auswahl("<q>Der <b>Verfluchte</b> erwacht. Er bleibt solange ein normaler Dorfbewohner und versucht mit diesen zu gewinnen, bis er von den Wölfen angegriffen wird. Daraufhin wechselt er die Seiten: Er ist als Wolf zu behandeln und - wichtig! - erwacht auch mit diesen. <i>Jede Nacht wird dem Verfluchten gezeigt, ob er sich verwandelt hat!</i></q> <b>(Verfluchten erfassen falls vorhanden)</b>",function(spieler){return HatKeineRolle(spieler);});
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									cschritt = 0;
									rollen[crolle].notiert = true;
								}
								break;
						}
					}
					if (rollen[crolle].notiert)
					{
						if (!IstRolleAufzurufen(crolle))
						{
							cschritt = 1;
						}
						switch (cschritt)
						{
							case 0:
								cschritt++;
								if (contains(rollen[rids["werwolf"]].werte.ziele,rollen[crolle].spieler))
								{
									if (rollen[rids["hexe"]].werte.ziel_retten!=rollen[crolle].spieler)
									{
										if (rollen[rids["leibwaechter"]].werte.ziel!=rollen[crolle].spieler)
										{
											rollen[crolle].werte.istwolf = true;
											rollen[crolle].istboese = true;
										}
									}
								}
								var reaktion = (IstRolleInaktiv(crolle)?einstellungen["text_vorsicht_tot"].wert:"Signalisiere dem Verfluchten: "+((rollen[crolle].werte.istwolf)?"Zum Werwolf verwandelt":"Ist noch Dorfbewohner")+".");
								Anzeige_Notiz("<q>Der <b>Verfluchte</b> erwacht. Er erkennt sein Schicksal...</q><b>("+reaktion+")</b><q>...und schläft wieder ein.</q>");
								break;
							case 1:
								RolleEnde();
								break;
						}
					}
				},
				});
	NeueRolle({name:"Detektiv / Seher",strid:"seher",
				balance:+7,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								Anzeige_Auswahl("<q>Der <b>Detektiv / Seher</b> kann jede Nacht die Identität eines Spielers untersuchen und erfährt (vom Spielleiter), ob dieser ein Werwolf ist.</q> <b>(Detektiv / Seher erfassen falls vorhanden)</b>",function(spieler){return HatKeineRolle(spieler);});
								rollen[crolle].werte.ziel = -1;
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									cschritt = 0;
									rollen[crolle].notiert = true;
								}
								break;
						}
					}
					if (rollen[crolle].notiert)
					{
						if (!IstRolleAufzurufen(crolle))
						{
							rollen[crolle].werte.ziel = -1;
							cschritt = 2;
						}
						switch (cschritt)
						{
							case 0:
								cschritt++;
								var rollentext = "<q>Der Detektiv / Seher erwacht. <b>Wessen</b> Identität möchte er untersuchen?</q>";
								AuswahlReset();
								if (IstRolleInaktiv(crolle))
								{
									Anzeige_Notiz(rollentext+einstellungen["text_vorsicht_tot"].wert);
									rollen[crolle].werte.ziel = -1;
								}
								else
								{
									Anzeige_Auswahl(rollentext,function(spieler){if (spieler.lebt && (spieler.rolle!=rids["seher"])) {return true;} else return false;});
								}
								break;
							case 1:
								if (Check_Auswahl(0,1,!IstRolleInaktiv(crolle)))
								{
									var antwort;
									rollen[crolle].werte.ziel = (auswahl.length>0?auswahl[0]:-1);
									if (rollen[crolle].werte.ziel!=-1)
									{
										antwort = (((leute[rollen[crolle].werte.ziel].rolle==rids["werwolf"]) || ((leute[rollen[crolle].werte.ziel].rolle==rids["verfluchter"]) && (rollen[rids["verfluchter"]].werte.istwolf )))?"JA!":"NEIN.");
									}
									else
									{
										antwort = "(keine Antwort)";
									}
									Anzeige_Notiz("<q>Der Detektiv / Seher erfährt, ob sein Ziel ein Mörder / Werwolf ist...</q>"+antwort+"<q>...und schläft wieder ein.</q>");
									cschritt++;
								}
								break;
							case 2:
								RolleEnde();
								break;
						}
					}
				},
				});
	NeueRolle({name:"Prinz",strid:"prinz",
				balance:+3,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								rollen[crolle].werte.erkannt = false;
								Anzeige_Auswahl("<q>Dem <b>Prinz</b> geschieht beim ersten Versuch ihn tagsüber zu hängen nichts, da er im letzten Moment von den Dorfbewohnern erkannt wird.</q> <b>(Prinz erfassen falls vorhanden)</b>",function(spieler){return HatKeineRolle(spieler);});
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									rollen[crolle].notiert = true;
									rollen[crolle].erwacht = false;
									RolleEnde();
								}
								break;
						}
					}
				},
				});
	NeueRolle({name:"Harter Bursche",strid:"harterbursche",
				balance:+3,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						switch (cschritt)
						{
							case 0:
								cschritt++;
								rollen[crolle].werte.angegriffen = false;
								Anzeige_Auswahl("<q>Der <b>Harte Bursche</b> stirbt erst eine Nacht nachdem er von den Werwölfen angegriffen wurde. Diese Verzögerung sorgt natürlich für etwas Verwirrung.</q> <b>(Harten Burschen erfassen falls vorhanden)</b>",function(spieler){return HatKeineRolle(spieler);});
								break;
							case 1:
								if (Check_Auswahl(0,1,false))
								{
									if (auswahl.length>0)
									{
										rollen[crolle].spieler = auswahl;
										RollenUebertragen(crolle);
									}
									rollen[crolle].notiert = true;
									rollen[crolle].erwacht = false;
									RolleEnde();
								}
								break;
						}
					}
				},
				});
	NeueRolle({name:"Dorfbewohner",strid:"dorfbewohner",
				balance:+1,
				einzelrolle:false,
				funktion_nacht:function()
				{
					if (!rollen[crolle].notiert)
					{
						RollenDorfbewohnerUebertragen(crolle);
						rollen[crolle].notiert = true;
						rollen[crolle].erwacht = false;
					}
					RolleEnde();
				},
				});
	
	SpielerToeten = function(ziel, ursprung)
	{
		var feedback = new Object();
		feedback.erfolg = true;
		feedback.ausgabe = "";
		
		//MEHRFACHTÖTUNGEN GIBTS NET
		if (leute[ziel].lebt==false)
		{
			feedback.erfolg = false;
			return feedback;
		}
		
		//TOD VERHINDERN
		if ((rollen[rids["prinz"]].anzahl>0) && (leute[ziel].rolle==rids["prinz"]) && contains(["galgen"],ursprung) && (rollen[rids["prinz"]].werte.erkannt==false))
		{
			rollen[rids["prinz"]].werte.erkannt = true;
			feedback.erfolg = false;
			feedback.ausgabe += "<q>Im letzten Moment erkennt das Dorf den Prinzen und rettet ihn vor dem Galgentod.</q>";
			return feedback;
		}
		if ((rollen[rids["leibwaechter"]].anzahl>0) && (ziel==rollen[rids["leibwaechter"]].werte.ziel) && (ursprung!="galgen"))
		{
			feedback.erfolg = false;
			return feedback;
		}
		if ((rollen[rids["hexe"]].anzahl>0) && (ziel==rollen[rids["hexe"]].werte.ziel_retten) && contains(["werwolf"],ursprung))
		{
			feedback.erfolg = false;
			return feedback;
		}
		if ((rollen[rids["verfluchter"]].anzahl>0) && (leute[ziel].rolle==rids["verfluchter"]) && contains(["werwolf"],ursprung))
		{
			feedback.erfolg = false;
			return feedback;
		}
		if ((rollen[rids["harterbursche"]].anzahl>0) && (leute[ziel].rolle==rids["harterbursche"]) && contains(["werwolf"],ursprung) && (rollen[rids["harterbursche"]].werte.angegriffen==false))
		{
			rollen[rids["harterbursche"]].werte.angegriffen = true;
			feedback.erfolg = false;
			return feedback;
		}

		//TOD VERARBEITEN
		leute[ziel].lebt = false;
		rollen[leute[ziel].rolle].lebende--;

		if ((ursprung=="galgen") && (einstellungen["rolle_lynchen_bekanntgeben"].wert))
		{
			rollen[leute[ziel].rolle].bekannt++;
			feedback.ausgabe += "<q>"+(einstellungen["rolle_lynchen_bekanntgeben"].wert
											?"Rolle: "+rollen[leute[ziel].rolle].name
											:"Er hatte eine "+(rollen[leute[ziel].rolle].istboese?"böse":"gute")+" Rolle."
										)+"</q>";
		}
		if (ursprung=="liebe")
		{
			if (einstellungen["rolle_verliebt_bekanntgeben"].wert)
			{
				rollen[leute[ziel].rolle].bekannt++;
			}
			feedback.ausgabe += "<q>Aufgrund von Liebeskummer hat sich "+leute[ziel].name+" von einer Klippe gestürzt. "+
								(einstellungen["rolle_lynchen_bekanntgeben"].wert
									?"Rolle: "+rollen[leute[ziel].rolle].name
									:"Er hatte eine "+(rollen[leute[ziel].rolle].istboese?"böse":"gute")+" Rolle."
								)+"</q>";
		}

		//TODESREAKTIONEN
		//Amor & Verliebte
		if ((rollen[rids["amor"]].anzahl>0) && (rollen[rids["amor"]].werte.verliebte.length==2))
		{
			var verliebter = -1;
			if (ziel==rollen[rids["amor"]].werte.verliebte[0])
			{
				verliebter = rollen[rids["amor"]].werte.verliebte[1];
			}
			else if (ziel==rollen[rids["amor"]].werte.verliebte[1])
			{
				verliebter = rollen[rids["amor"]].werte.verliebte[0];
			}
			if (verliebter>=0 && leute[verliebter].lebt)
			{
				var vtext = SpielerToeten(verliebter, "liebe");
				feedback.ausgabe += vtext.ausgabe;
			}
		}
		
		return feedback;
	}
	
	Tagesaktionen = function()
	{
		var report = new Array;
		switch (cschritt)
		{
			case 0:
				//TAG BRICHT AN: Tote in Arrays sammeln, Nachrichten verkündigen
				cschritt++;
				report.push("Ein neuer Tag bricht an und das Dorf erwacht.");
				var gestorben_namen = new Array();
				var gestorben_ids = new Array();
				var zusatztext = "";
				
				//Harter-Bursche-Verzögerungstod
				if ((rollen[rids["harterbursche"]].anzahl>0) && (rollen[rids["harterbursche"]].werte.angegriffen))
				{
					var ziel = rollen[rids["harterbursche"]].spieler[0];
					var feedback = SpielerToeten(ziel, "harterbursche");
					if (feedback.erfolg)
					{
						zusatztext += feedback.ausgabe;
						gestorben_namen.push(leute[ziel].name);
						gestorben_ids.push(leute[ziel].spielerID);
					}
				}
				//Werwolftode
				for (var i in rollen[rids["werwolf"]].werte.ziele)
				{
					var ziel = rollen[rids["werwolf"]].werte.ziele[i];
					var feedback = SpielerToeten(ziel, "werwolf");
					if (feedback.erfolg)
					{
						zusatztext += feedback.ausgabe;
						gestorben_namen.push(leute[ziel].name);
						gestorben_ids.push(leute[ziel].spielerID);
					}
				}
				//Gifttod (Hexe)
				if ((rollen[rids["hexe"]].anzahl>0) && (rollen[rids["hexe"]].werte.ziel_toeten>=0))
				{
					var ziel = rollen[rids["hexe"]].werte.ziel_toeten;
					var feedback = SpielerToeten(ziel, "hexe");
					if (feedback.erfolg)
					{
						zusatztext += feedback.ausgabe;
						gestorben_namen.push(leute[ziel].name);
						gestorben_ids.push(leute[ziel].spielerID);
					}
				}
				//Alte Vettel
				if ((rollen[rids["altevettel"]].anzahl>0) && (rollen[rids["altevettel"]].werte.ziel>=0))
				{
					if (leute[rollen[rids["altevettel"]].werte.ziel].lebt)
					{
						report.push(leute[rollen[rids["altevettel"]].werte.ziel].name + " ist heute vor Scham über die Gerüchte im Umlauf abwesend (schweigt und ist nicht lynchbar/wählbar).");
					}
					else
					{
						report.push("Über "+leute[rollen[rids["altevettel"]].werte.ziel].name + " wurden zwar schlimmste Gerüchte verbreitet, aber über die Toten lästert man nicht.");
					}
				}
				//Report und Lynchjustiz
				switch (gestorben_ids.length)
				{
					case 0:
						report.push("In dieser Nacht ist niemand gestorben.");
						break;
					case 1:
						report.push(gestorben_namen[0]+" ist in der Nacht gestorben.");
						break;
					default:
						report.push("Gestorben sind in dieser Nacht: "+gestorben_namen.join(", ")+".");
						break;
				}
				
				//ANZEIGE
				Anzeige_Notiz('<q>'+report.join(" ")+'</q>');
				Anzeige_Zusatz(zusatztext+'<b>(Diskussionsphase)</b>');
				break;
			case 1:
				cschritt++;
				report.push('<q>Ein Lynchmob tut sich zusammen, fest entschlossen das Böse zu entlarven.<b>Wer soll nun hängen?</b></q>');
				Anzeige_Auswahl(report.join(" ")+' <b>(Abstimmungsphase)</b>',function(spieler){if (spieler.lebt && spieler.waehlbar) {return true;} else return false;});
				break;
			case 2:
				if (Check_Auswahl(0,1,true))
				{
					cschritt++;
					cschritt+=2; //deaktiviert Noch-jmd-lynchen-Frage
					if (auswahl.length==0)
					{
						Anzeige_Notiz("<q>Niemand wurde gelyncht.</q>");
					}
					else
					{
						//TAGESLYNCHEN
						var ziel = auswahl[0];
						var feedback = SpielerToeten(ziel, "galgen");
						if (feedback.erfolg)
						{
							Anzeige_Notiz('<q>'+leute[ziel].name+" wurde gelyncht.</q>");
							Anzeige_Zusatz(feedback.ausgabe);
						}
						else
						{
							Anzeige_Notiz(feedback.ausgabe);
						}
					}
				}
				break;
			case 3:
				//DEAKTIVIERT! (siehe oben)
				cschritt++;
				Anzeige_Entscheidung("Noch jemanden hängen? <i>(Standard ist nur einmal Lynchen pro Tag)</i>");
				break;
			case 4:
				if (entscheidung)
				{
					cschritt = 1;
				}
				else
				{
					cschritt++;
				}
				Schritt();
				break;
			case 5:
				cschritt++;
				//TAG BEENDET: Aufräumen, z.B. Effekte wiederaufheben
				Anzeige_Notiz("<q>Die Nacht bricht über dem Dorf herein...</q>");
				//Alte Vettel
				if (rollen[rids["altevettel"]].anzahl>0)
				{
					var ziel = rollen[rids["altevettel"]].werte.ziel;
					if (rollen[crolle].werte.ziel!=-1)
					{
						leute[ziel].verstummt = false;
						leute[ziel].waehlbar = true;
					}
				}
				//Hexe (theoretisch nicht nötig, schon im Zugcode vorhanden)
				if (rollen[rids["hexe"]].anzahl>0)
				{
					rollen[rids["hexe"]].werte.ziel_retten = -1;
					rollen[rids["hexe"]].werte.ziel_toeten = -1;
				}
				//Leibwächter
				if (rollen[rids["leibwaechter"]].anzahl>0)
				{
					rollen[rids["leibwaechter"]].werte.letztes_ziel = rollen[rids["leibwaechter"]].werte.ziel;
					rollen[rids["leibwaechter"]].werte.ziel = -1;
				}
				break;
			case 6:
				Phasenwechsel();
				break;
			case 777:
				Anzeige_Notiz_Solo('Danke für\'s Spielen und das Benutzen dieser WebApp =)<div class="zentriermich"><br><button class="listenbutton menulistenbutton" onclick="Button_Neustart();">Neustart</button></div>');
				Anzeige_Menu(["spiel_guide","spiel_status"]);
				break;
		}
		if (cschritt!=777 && Check_Sieg())
		{
			localStorage.removeItem("NWWA_Speicherstand");
			running = false;
			cschritt = 777;
		}
	}

	Aktion_SpielerSchreiben();
	Aktion_RollenSchreiben();
				
}
function SpielStart()
{
	if (spieleranzahl<6)
	{
		Anzeige_Hinweis("Man kann Werwolf leider nicht sinnvoll mit weniger als 6 Spielern spielen =(");
		return false;
	}
	if (rollenanzahl<spieleranzahl)
	{
		Anzeige_Hinweis("Weniger Rollen als Spieler sind nicht möglich!");
		return false;
	}
	if (rollen[rids['werwolf']].anzahl==0)
	{
		Anzeige_Hinweis("Ohne Werwolf geht es nun wirklich nicht...");
		return false;
	}
	
	running = true;
	Anzeige_Menu(["spiel_guide"]);
	
	cphase = "tag"; //erster Phasenwechsel bewirkt Start mit Nacht!
	crolle = -1; //Damit die Statusanzeige nicht spinnt
	tagzahl = 0;
	nachtzahl = 0;
	//Mögliche Rollen als "Im Spiel" markieren
	for (var index in rollen)
	{
		if (rollen[index].anzahl > 0) rollen[index].imspiel = true;
	}
	//Spieler aktivieren
	for (var index in leutesammler)
	{
		NeuerSpieler({name:leutesammler[index]});
	}
	//Virtuelle Karten generieren
	Aktion_KartenZufallsliste();
	Aktion_KartenVerteilen(0);
	//Introtextanzeige
	Anzeige_Notiz_Solo("Willkommen zu einer neuen Partie Werwolf!<hr>"+
	"<h3>Kleine Erklärhilfe</h3><ol><li>Grundprinzip der Werwolfsbedrohung</li><li>Ziele der Parteien und Siegbedingungen</li><li>Normaler Tag-Nacht-Zyklus</li><li>Regeln für die Nacht</li><li>Ablauf des Tages mit Lynchregeln</li><li>Sondercharaktere im Spiel</li><li>Regeln für Tote, Umgang mit Rollenkarten, Umgang mit Wahrheit und Lüge</li></ol>"+
	"<hr><p style=\"font-size:1.0em;\">Kein Werwolfspiel mit Rollenkarten zur Hand? Hier gibt's virtuelle Karten:</p>"+
	"<div class=\"zentriermich\"><button class=\"blaubutton\" onclick=\"Anzeige_Menu(['spiel_rollenvergabe']);\">Kartenvergabe</button></div>"+
	"<hr><q>Das Dorf schläft ein, alle schließen die Augen.</q>"+
	"");
	
	document.getElementById("ausgabeinteraktion").innerHTML = '<div class="zentriermich"><button class="blaubutton" onclick="this.style.visibility=\'hidden\';Anzeige_Menu([\'spiel_guide\',\'spiel_status\',\'spiel_admin\']);Phasenwechsel();">Alle schlafen&nbsp;&#9658;</button></div>';
}
function Phasenwechsel()
{
	//Am Anfang jeder Nacht aktuelles Spiel sichern, ggf. auch in HTML5-Browser-Storage
	if (cphase=="tag")
	{
		speicherstand = ErstelleSpeicherstand();
		if (supports_html5_storage())
		{
			localStorage.NWWA_Speicherstand = speicherstand;
		}
	}

	//Tag/Nacht-Wechsel
	if (cphase=="tag") {cphase = "nacht";} else {cphase = "tag";}
	
	switch (cphase)
	{
		case "nacht":
			nachtzahl++;
			crolle = 0;
			RolleStart();
			break;
		case "tag":
			tagzahl++;
			crolle = -1;
			RolleStart();
			break;
	}
	SchrittuhrNeustart();
}
function RolleStart()
{
	cschritt = 0;
	Schritt();
}
function RolleEnde()
{
	crolle++;
	if (crolle >= rollen.length)
	{
		Phasenwechsel();
	}
	else RolleStart();
}
function Schritt()
{
	window.scrollTo(0,1);
	switch (cphase)
	{
		case "nacht":
			switch (rollen[crolle].strid)
			{
				default:
					if (rollen[crolle].funktion_nacht===false)
					{
						RolleEnde();
					}
					else if(rollen[crolle].imspiel && rollen[crolle].erwacht)
					{
						rollen[crolle].funktion_nacht();
					}
					else
					{
						RolleEnde();
					}
					break;
			}
			break;
		case "tag":
			Tagesaktionen();
			break;
	}
	Statusupdate();
}
function BerechneBalance()
{
	var balance = 0;
	for (var index in rollen)
	{
		balance += (rollen[index].balance * rollen[index].anzahl);
	}
	return (balance>0?"+":"")+balance;
}
function RollenUebertragen(rollenid)
{
	var rollenspieler = rollen[rollenid].spieler;
	for (var index in rollenspieler)
	{
		leute[rollenspieler[index]].rolle = rollenid;
	}
	rollen[rollenid].anzahl = rollen[rollenid].spieler.length;
	rollen[rollenid].lebende += rollen[rollenid].anzahl;
}
function RollenDorfbewohnerUebertragen(rollenid)
{
	for (var index in leute)
	{
		if (leute[index].rolle==-1)
		{
			leute[index].rolle = rollenid;
			rollen[rollenid].spieler.push(leute[index].spielerID);
		}
	}
	rollen[rollenid].anzahl = rollen[rollenid].spieler.length;
	rollen[rollenid].lebende += rollen[rollenid].anzahl;
}
function Check_Auswahl(min, max, nullwarnung)
{
	if (auswahl.length==0 && nullwarnung)
	{
		if (!confirm("Eigentlich sollte hier eine Auswahl stattfinden. Spielleitervollmacht beanspruchen, Warnung ignorieren und niemanden auswählen?"))
		{
			return false;
		}
	}
	if (max==-1)
	{
		if (auswahl.length<min)
		{
			Anzeige_Hinweis("Auswahl: mind. "+min+" Spieler");
			return false;
		}
	}
	else
	{
		if ((min==max) && (auswahl.length!=min))
		{
			Anzeige_Hinweis("Auswahl: genau "+min+" Spieler!");
			return false;
		}
		else if (auswahl.length<min)
		{
			Anzeige_Hinweis("Auswahl: mind. "+min+" Spieler");
			return false;
		}
		else if (auswahl.length>max)
		{
			Anzeige_Hinweis("Auswahl: max. "+max+" Spieler");
			return false;
		}
	}
	return true;
}
function Check_Sieg()
{
	var gute = 0;
	var boese = 0;
	for (var i in leute)
	{
		if (leute[i].lebt)
		{
			if (leute[i].rolle==rids["werwolf"] || (leute[i].rolle==rids["verfluchter"] && rollen[rids["verfluchter"]].werte.istwolf))
			{
				boese++;
			}
			else
			{
				gute++;
			}
		}
	}
	if (gute == 0)
	{
		Anzeige_Zusatz('<div class="zentriermich"><b>SPIELENDE</b><br>Werwölfe gewinnen</div>');
		return true;
	}
	if (boese == 0)
	{
		Anzeige_Zusatz('<div class="zentriermich"><b>SPIELENDE</b><br>Dorfbewohner gewinnen</div>');
		return true;
	}
	return false;
}
function SchrittuhrNeustart()
{
	document.getElementById("schrittuhr").innerHTML = "00:00";
	if (schrittuhr_intervall)
	{
		clearInterval(schrittuhr_intervall);
	}
	schrittuhr_sek = 0;
	schrittuhr_intervall = setInterval(function(){SchrittuhrUpdate();},1000);
}
function SchrittuhrUpdate()
{
	schrittuhr_sek++;
	var sek = schrittuhr_sek % 60;
	var min = (schrittuhr_sek - sek) / 60;
	sek = (sek<10?'0'+sek:sek);
	min = (min<10?'0'+min:min);
	document.getElementById("schrittuhr").innerHTML = min + ":" + sek;
}
function Statusupdate()
{
	var phasenstatus = "";
	phasenstatus += "<div>"+(cphase=="tag"?"<b>Tag</b>":"Tag")+": "+tagzahl+" - "+(cphase=="nacht"?"<b>Nacht</b>":"Nacht")+": "+nachtzahl+" - <span id=\"schrittuhr\">00:00</span></div>";
	phasenstatus += "<div>Aktuelle Rolle: <i>"+(crolle>=0?rollen[crolle].name:"-")+"</i></div>";
	var ergebnis_lebt = new Array();
	var ergebnis_tot = new Array();
	//Schleife über alle Spieler
	for (var i in leute)
	{
		var klassen = new Array();
		var eintrag = leute[i].name;
		//Randfärbung je nach Gesinnung
		if (leute[i].rolle>=0)
		{
			if (rollen[leute[i].rolle].istboese)
			{
				klassen.push("status_boese");
			}
			else
			{
				klassen.push("status_gut");
			}
		}
		//Verliebt-Herzchen
		if ((rollen[rids["amor"]].anzahl>0) && (rollen[rids["amor"]].werte.verliebte) && (rollen[rids["amor"]].werte.verliebte.length==2) && (contains(rollen[rids["amor"]].werte.verliebte,leute[i].spielerID)))
		{
			eintrag += " &hearts;";
		}
		//Bürgermeister
		if (false)
		{
			eintrag += " &#9734;";
		}
		//Klassenangabe falls kein Dorfbewohner
		if ((leute[i].rolle>=0) && rollen[leute[i].rolle].strid!="dorfbewohner")
		{
			eintrag += '<span class="status_klassentext">'+rollen[leute[i].rolle].name+'</span>';
		}
		//Fertig, hinzufügen zu Lebend/Tot zur späteren Ausgabe
		if (!leute[i].lebt)
		{
			klassen.push("status_tot");
			ergebnis_tot.push('<li class="'+klassen.join(" ")+'">'+eintrag+'</li>');
		}
		else
		{
			ergebnis_lebt.push('<li class="'+klassen.join(" ")+'">'+eintrag+'</li>');
		}
	}
	document.getElementById("statusausgabe").innerHTML = phasenstatus + '<ul>' + ergebnis_lebt.join("") + ergebnis_tot.join("") + '</ul>';
}
function IstRolleAufzurufen(rollenid)
{
	if (rollen[rollenid].lebende>0)
	{
		return true;
	}
	else if ((rollen[rollenid].bekannt==rollen[rollenid].anzahl) && einstellungen["rollen_anzahlen_bekannt"].wert)
	{
		return false;
	}
	else if (einstellungen["rolle_tot_zugeben"].wert)
	{
		return false;
	}
	return true;
}
function IstRolleInaktiv(rollenid)
{
	if (rollen[rollenid].lebende==0)
	{
		return true;
	}
	else
	{
		return false;
	}
}
function HatKeineRolle(spieler)
{
	if (leute[spieler.spielerID].rolle==-1)
	{
		return true;
	}
	else
	{
		return false;
	}
}
	

/* UI-Funktionen */

function TESTSETUP()
{
	leutesammler = new Array();
	leutesammler.push("Amy");
	leutesammler.push("Bruce");
	leutesammler.push("Christopher");
	leutesammler.push("David");
	leutesammler.push("Eugene");
	leutesammler.push("Freema");
	leutesammler.push("Gilroy");
	leutesammler.push("Harley");
	leutesammler.push("Irene");
	leutesammler.push("John");
	leutesammler.push("Karen");
	leutesammler.push("Lisa");
	leutesammler.push("Matt");
	leutesammler.push("Norman");
	leutesammler.push("Olaf");
	Aktion_SpielerSchreiben();
	Aktion_RolleEintragen(rids['werwolf']);
	Aktion_RolleEintragen(rids['harterbursche']);
	Aktion_RolleEintragen(rids['hexe']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
	Aktion_RolleEintragen(rids['dorfbewohner']);
}
function Anzeige_Menu(anzeige)
{
	var felder = ["spiel_hauptmenu","spiel_setup","spiel_guide","spiel_status","spiel_anleitung","spiel_einstellungen","spiel_admin","spiel_rollenvergabe"];
	for (var i in felder)
	{
		document.getElementById(felder[i]).style.display = "none";
	}
	for (var i in anzeige)
	{
		document.getElementById(anzeige[i]).style.display = "block";
		if (anzeige[i]=="spiel_hauptmenu")
		{
			if (spielstand_vorhanden())
			{
				document.getElementById("continuebutton").style.display = "inline";
			}
			else
			{
				document.getElementById("continuebutton").style.display = "none";
			}
		}
		if (anzeige[i]=="spiel_setup")
		{
			Aktion_SpielerSchreiben();
			Aktion_RollenSchreiben();
		}
		if (anzeige[i]=="spiel_einstellungen")
		{
			Aktion_EinstellungenSchreiben();
		}
	}
	window.scrollTo(0,1);
}
function Anzeige_Zusatz(notiz)
{
	document.getElementById("ausgabecontent").innerHTML += notiz;
}
function Anzeige_Entscheidung(frage)
{
	document.getElementById("ausgabecontent").innerHTML = frage;
	document.getElementById("ausgabeinteraktion").innerHTML = '<button class="blaubutton jabutton" onclick="this.style.visibility=\'hidden\';entscheidung=true;Schritt();">Ja&nbsp;&#10004;</button><button class="blaubutton neinbutton" onclick="this.style.visibility=\'hidden\';entscheidung=false;Schritt();">Nein&nbsp;&#10006;</button>';
}
function Anzeige_Notiz(notiz)
{
	document.getElementById("ausgabecontent").innerHTML = notiz;
	document.getElementById("ausgabeinteraktion").innerHTML = '<div class="zentriermich"><button class="blaubutton" onclick="this.style.visibility=\'hidden\';Schritt();">Weiter&nbsp;&#9658;</button></div>';
}
function Anzeige_Notiz_Solo(notiz)
{
	document.getElementById("ausgabecontent").innerHTML = notiz;
	document.getElementById("ausgabeinteraktion").innerHTML = '';
}
function AuswahlReset()
{
	auswahl = new Array();
}
function Anzeige_Auswahl(nachricht, filterfunktion) //Spielerauswahl
{
	var liste = "";
	AuswahlReset();
	for (var index in leute)
	{
		if (filterfunktion(leute[index]))
		{
			liste += '<option value="'+leute[index].spielerID+'">'+leute[index].name+'</option>';
		}
	}
	liste = '<div><select id="spielerauswahl" size="1" onChange="Aktion_AuswahlPlus(this.options[this.selectedIndex].value);"><option selected="selected" value="-1">&#9660;&nbsp;Spieler...</option>'+liste+'</select>';
	liste += '<button class="blaubutton" id="auswahlbutton" onclick="Schritt();">OK&nbsp;&#9658;</button></div>';
	liste += '<ul id="auswahlanzeige"></ul>';
	document.getElementById("ausgabecontent").innerHTML = nachricht;
	document.getElementById("ausgabeinteraktion").innerHTML = liste;
}
function Aktion_AuswahlPlus(plus)
{
	plus = parseInt(plus);
	if (plus==-1) {return;}
	if (!contains(auswahl,plus))
	{
		auswahl.push(plus);
	}
	Aktion_AuswahlSchreiben();
}
function Aktion_AuswahlMinus(minus)
{
	for (var index in auswahl)
	{
		if (auswahl[index]==minus)
		{
			auswahl.splice(index,1);
			break;
		}
	}
	Aktion_AuswahlSchreiben();
}
function Aktion_AuswahlSchreiben()
{
	var ergebnis = new Array();
	for (var index in auswahl)
	{
		ergebnis.push('<li>'+leute[auswahl[index]].name+'&nbsp;<button class="listenbutton" onclick="Aktion_AuswahlMinus('+auswahl[index]+');">'+
						'<img src="data:image/png;base64,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">'+
						'</button></li>');
	}
	document.getElementById("auswahlanzeige").innerHTML = ergebnis.join("");
	document.getElementById("spielerauswahl").selectedIndex = 0;
}
function Aktion_SpielerEintragen()
{
	if (document.getElementById("spielername").value.trim()!="")
	{
		var neuername = document.getElementById("spielername").value;
		leutesammler.push(neuername.charAt(0).toUpperCase() + neuername.slice(1));
	}
	Aktion_SpielerSchreiben();
	document.getElementById("spielername").value = "";
	document.getElementById("spielername").focus();
}
function Aktion_SpielerAustragen(index)
{
	leutesammler.splice(index,1);
	Aktion_SpielerSchreiben();
}
function Aktion_SpielerSchreiben()
{
	var liste = new Array();
	for (var index in leutesammler)
	{
		liste.push('<li>'+leutesammler[index]+'<button class="listenbutton" onclick="Aktion_SpielerAustragen('+index+');return false;">'+
					'<img src="data:image/png;base64,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">'+
					'</button></li>');
	}
	var addfield =	'<li><input type="text" id="spielername" placeholder="Neuer Spieler"><button class="listenbutton" onclick="Aktion_SpielerEintragen();return false;">'+
					'<img src="data:image/png;base64,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">'+
					'</button><br>';
	spieleranzahl = liste.length;
	document.getElementById("spielerliste").innerHTML = liste.join("")+addfield;
	document.getElementById("spieleranzahl").innerHTML = liste.length;
}
function Aktion_RolleEintragen(index)
{
	if (index=="-1")
	{
		return;
	}
	if (rollen[index].einzelrolle && rollen[index].anzahl>0)
	{
		Anzeige_Hinweis("Diese Rolle darf es im Spiel nur einmal geben.");
	}
	else
	{
		rollen[index].anzahl++;
	}
	Aktion_RollenSchreiben();
}
function Aktion_RolleAustragen(index)
{
	if (rollen[index].anzahl<=0) return;
	rollen[index].anzahl--;
	Aktion_RollenSchreiben();
}
function Aktion_RollenSchreiben()
{
	var quelle = new Array();
	var liste = new Array();
	var gesamtzahl = 0;
	for (var index in rollen)
	{
		quelle.push('<option value="'+index+'">'+rollen[index].name+'</option>');
		if (rollen[index].anzahl>0)
		{
			liste.push('<li>'+rollen[index].anzahl+' '+rollen[index].name+
						'<button class="listenbutton" onclick="Aktion_RolleAustragen('+index+')">'+
						'<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAEMUlEQVRYhe2UXWgUVxiGn3NmZnd215ndNZtN1DYoKS1KmxQlLRpB26KtigQlGCWgiK14VW8VyUULvSsWRNErfwpGVBShYgWRVDRWkBb1phibbBSbVdQk+787O7unF8mWELL+FGqhzQPnYubM+Z73nPlmYJpp/u+IqW4ehLkCZkkICEgH4fYGyL1K4R4wvdBkgK1DVkK8GWLPDXAQ5ko4BbQIQBsfEoY1+KITzr6M/CqsNeCwBpEJNdDgVw90vAW/TxngEJydt3z5ug+3bkUIgV4qkRsa4u65czy8ebOswdp2uPA8+XX4RIOLEdPU66XEUyhQ9vlw/H5G0mmK2eyPjbC68rycdBwiunAhM5qb8ds2hq4TrKnhg40bmdvUJHU4eR7erSa/AQt0OBsxTX3epk34ikU0jwcjGCRQW4tpmmiTNi0nXZy5s28fjusi6uoQhgGOg3Ac3l+9mlA0OkPCqQtgT5bfhoAGJwK6bs/bvx+6u0EIsG2wLBzXJT8yggZnqgb4HI4L1+3p6eigHAggolGE3w/5PFqpRMuaNQT8/vke+F5NWKtAOHDUK2XTO3v3QlcXuO6Y3LYpaRrDsRiaUj+/AYerBhCgTGjP9PcP3N61CyIR1KxZqPEQXil5r7UVr5RtvfBNZd0v8JUhRPvbO3cie3sRjx6BZY0F8PkYuX8fHOehDusElCc6tclHeRpym+BK+t69zYFw2LAXLQIhEPE4JBKYUuIRguSTJ6074O6Osfe+783GRmEtXQoHDkAgAKEQBIMk43Gc0dGcASujE7q/agCAk/C4E+LPrl5tiy5ejLehASUEYmAAkU4zwzAo5XIin8l8asDaGr/frNu9G7VnD3g8Y/JQiOzoKNl4HAk7o/DDVK4pAwCcgFtbwHp26dKSOW1taMEgStMQfX2Qy2F5POSSSa9XCG/DqlVw6NBY043Li6USqcFBpFIH6uDrap4p/4QVToFWD+ethobPmo4ehWQSdeUKoqcHkc3iplKQy6Hn81AsQjgM4TBlr5fRvj5wnJ9qYKWAYjWHrDYBsAFKOnQ6Dx70D3Z1oUIhaGmBxkbI59GLRXTHQRQKf3W88vlIxWIIx4l5oP158hcGAFgCwzqsT/T2ZkaPHUPU1qJWrICZMyGfh0IBVel4yyI3NITKZLIS1tvw7EX1XxgAYBHcMWDz4yNHVOHGDcScOZQ7OlCmCV7v2CdnWRSGh3GePkWD7WG49TK1qzbhZA7Cb1+CP3vtWqu1bBmyvh5VU4MYGADbxi0WyQ8OosF3Qfj2Zeu+EgpkDC4MRSKqfPq0KnV3K3f7duUuWKAShqFScFG9wqb+Fvch/AfcS7S0qNLly8o9flxlZs9WKehPwMx/VF5hCOY/hURh2zZV6OxUGUinofm1yCsMQ2cSyhkop2HLa5VXSMFHKfj4X5FPM81/hj8BdOd1/TvC+zkAAAAASUVORK5CYII=">'+
						'</button>'+
						'<button class="listenbutton" onclick="Aktion_RolleEintragen('+index+')">'+
						'<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAESklEQVRYhe2TWWxUVRzGf+fcOzN3pstMd6YpCNVQSIGypRBZJaW4lBAwIREJSyA8aQ0KxGhEEjcSjUuQBwKSCPpgDBVCQoBGiQUpKQVZtBZKFygWMLaUkmk7M/ec44OlggEsIjyYfsl9uvf/fb//cqFf/erXfShQMSscqJgVvh8P+W8L/YemT9QyXmds95y/cuakhwrg3zd1oImxszhnfMKIAYMDGL3LOViU+3AAdo8LaMOuUSm5WXMHTSL9kQAev0wTUpdRPTvwwAG8xtkUdkJj3h6xlFpxjt9kOxnDgggpCpzuyOYHCuAre7zURi78tHAlzfYFurhONkH8joeMvGSENgv8h2asuhdPq68fOl9NeALDFx9MekHKkKKR83ixEUgUmog/hpSSrrZYkbU896ja2niuL759moCzrXCIds3XS/KfsnMyU6iniTgKA2SRRDYhwgRJGugnMcMrhau/9B2Y/th/A7BpXEArXTZ+QF7anGGTqaWBLroA0/NANkGyCZJGAql5yXgDdoqEMvYVJ9w3gBe9OcMJjl47eRlnZD3ttPdGx5VLTLlYyL+mIB3S84MIIUb6vLHtGMTd/O96A56NBSttYa3aMu8NmgO/cpGWm94a9ladoK7lEsU5hXQSwYONwtDpiWIlWnRe7hpuNw2Oup+fP3TPAPaHo6YIw/b1s1+yRKamniYMBnoaOnLqLMdr61Vrx3XTTod8NnMmbbQiESgMkUAMSwi6WqPT7MVDKt1tTQ23y7ntCpz3RuYKpXcumljiyRmUTgONKFzAYDDUNbVw+HgNwtWrUWbl4dO1VF45TQH5ZJLUexNJgxNIzHJstN7hLZ86vG8A749KcJUqG/vI8NQ546dRw1kidPfs3dDado39B6pB6a3RJdUfRRdWbUDpLRu+34ET9ZNOKmFChAn9eZT5QbyJnmSpxTeUFwX/EcCKRD9OS0wueH32CmqsOq5yradvQ3c0zu49lcS6YydjXrf0Rk3UZ5fGYu6xJXvfYowaiYXomUKIZOmQMTqEtMhzdGzjXQHsVx99Urhm+frnXqbBaaKFK72dGwzl+6u52nq9xVbiaRadivQWzq/s8riUdHRELq6oeIdnKMKPpxciwe8jbUQQlH7et29yyR0BhJaLSwqnE8+M0khzb7ABqn6ooaH2ootiUeeLP978OwAQWXr0slZqQUPzpfiaE58wlFyC+AkTJEyQQJaDP80HLsvuCGAwKb9H2zjddRaFAgxKKU4cOUNVxc/gqtXuK6e+/Xv4DblLjx80rik9cvIXtv20h7jSPUcZIjOeBNqAMqm3NH3LClYPnYLQu4GgL+AFS+BqjdLaxRLvumtr37xT+M3yfjb2NaRcZ3stj+2xEZak242DJTqEFHO75x3+7rYAAKzJS7KMLpZCpyFBCyuqfO4B1jVc6Ev4Dfk3T8hxPWoGCAcPCCnbYpZbzvxj1+7Fp1/9+v/rDwgiscxlnwJMAAAAAElFTkSuQmCC">'+
						'</button>'+
						'</li>');
		}
		gesamtzahl += rollen[index].anzahl;
	}
	rollenanzahl = gesamtzahl;
	quelle.unshift('<select size="1" onChange="Aktion_RolleEintragen(this.options[this.selectedIndex].value);" id="rollenselect"><option selected="selected" value="-1">&#9660;&nbsp;Rolle hinzufügen...</option>');
	quelle.push('</select>');
	document.getElementById("rollenliste").innerHTML = liste.join("") +'<li>'+quelle.join(", ")+'</li>';
	document.getElementById("rollenanzahl").innerHTML = gesamtzahl;
	document.getElementById("balanceanzeige").innerHTML = BerechneBalance();
}
function Aktion_EinstellungBearbeiten(setid,setvalue)
{
	einstellungen[setid].wert = (setvalue==1?true:false);
}
function Aktion_EinstellungenSchreiben()
{
	var liste = new Array();
	for (var index in einstellungen)
	{
		if (index.indexOf("text_")==0)
		{
			continue;
		}
		einstellung = einstellungen[index];
		liste.push('<p>'+einstellung.text+
					'<div style="text-align:right;"><select class="einstellungsauswahl" id="setter_'+einstellung.id+'" size="1" onChange="Aktion_EinstellungBearbeiten(\''+einstellung.id+'\',this.options[this.selectedIndex].value);">'+
					'<option '+(einstellung.wert==true?'selected="selected" ':'')+'value="1">Ja</option>'+
					'<option '+(einstellung.wert==false?'selected="selected" ':'')+'value="0">Nein</option>'+
					'</select></div></p>');
	}
	document.getElementById("ausgabeeinstellungen").innerHTML = liste.join("<hr>");
}
function Anzeige_Hinweis(nachricht)
{
	alert(nachricht);
}
function Button_Neustart(button)
{
	if(!running || confirm('Aktuelles Spiel wirklich beenden?'))
	{
		SpielReset();
		Anzeige_Menu(['spiel_hauptmenu']);
	}
}
function Button_NachtWiederholen(button)
{
	if (confirm('Möchtest du das Spiel zurückspulen und die letzte Nacht erneut starten?'))
	{
		LadeSpeicherstand(speicherstand);
		running = true;
		Phasenwechsel();
	}
}
function Button_Fortsetzen(button)
{
	if (confirm('Speicherstand am Beginn der letzten Nacht laden?'))
	{
		LadeSpeicherstand(localStorage.NWWA_Speicherstand);
		running = true;
		Anzeige_Menu(["spiel_guide","spiel_status","spiel_admin"]);
		Phasenwechsel();
	}
}
function Aktion_KartenZufallsliste()
{
	kartenliste = new Array();
	while (!contains(kartenliste,"Mörder / Werwölfe")) //falls der Zufall alle Werwölfe rauskickt
	{
		kartenliste = new Array();
		var klist = new Array();
		var kmap = new Object();
		for (var index in rollen)
		{
			for (var i=0; i<rollen[index].anzahl; i++)
			{
				var sortierer = Math.random().toString();
				kmap[sortierer] = rollen[index].name;
				klist.push(sortierer);
			}
		}
		klist.sort();
		for (var i=0; i<spieleranzahl; i++)
		{
			kartenliste.push(kmap[klist[i]]);
		}
	}
}
function Aktion_KartenVerteilen(spieler)
{
	document.getElementById("kartenvergabe_spieler").innerHTML = "Spieler "+(spieler+1)+" von "+spieleranzahl;
	document.getElementById("karte").innerHTML =
		"<button style=\"float:right;\" class=\"listenbutton\" onclick=\"Aktion_KartenVerteilen("+((spieler+1)%spieleranzahl)+");\">&#9658;</button>"+
		"<button style=\"float:left;\"  class=\"listenbutton\" onclick=\"Aktion_KartenVerteilen("+((spieler+-1)%spieleranzahl)+");\">&#9668;</button>"+
		"<br><br><b>Rolle:</b><br><br>"+kartenliste[spieler]+"<br>";
}
